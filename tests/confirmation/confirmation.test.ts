import "dotenv/config";
import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { createHmac, randomBytes } from "node:crypto";
import { prisma } from "../../src/lib/prisma";

const key = randomBytes(24).toString("hex");
const sign = (text: string) =>
  createHmac("sha256", process.env.AUTH_SECRET!).update(text).digest("hex");
let cookie: string | undefined = key + "." + sign(key);
await mock.module("next/headers", {
  namedExports: {
    cookies: async () => ({
      get: () => (cookie ? { value: cookie } : undefined),
    }),
    headers: async () => new Headers(),
  },
});
const { confirmReviewPosted } =
  await import("../../src/services/review-session.service");
test("confirmation requires ownership and handoff, and concurrent retries preserve one timestamp", async () => {
  const slug = randomBytes(12).toString("base64url");
  let userId: string | undefined;
  let categoryId: string | undefined;
  try {
    const category = await prisma.category.create({
      data: { name: slug, slug },
    });
    categoryId = category.id;
    const user = await prisma.user.create({
      data: {
        email: slug + "@example.test",
        merchant: {
          create: {
            name: "Confirmation test",
            businesses: {
              create: {
                name: "Test",
                categoryId,
                locations: {
                  create: {
                    name: "Test",
                    googleReviewUrl: "https://g.page/r/test/review",
                    qrCodes: { create: { slug } },
                  },
                },
              },
            },
          },
        },
      },
    });
    userId = user.id;
    const qr = await prisma.qRCode.findUniqueOrThrow({ where: { slug } });
    await assert.rejects(() => confirmReviewPosted({ slug }));
    assert.equal(
      await prisma.reviewSession.count({ where: { qrCodeId: qr.id } }),
      0,
    );
    const session = await prisma.reviewSession.create({
      data: {
        qrCodeId: qr.id,
        visitorKey: sign("visitor:" + key),
        status: "REVIEW_GENERATED",
        rating: 5,
      },
    });
    await assert.rejects(() => confirmReviewPosted({ slug }));
    await prisma.reviewSession.update({
      where: { id: session.id },
      data: { clickedGoogle: true },
    });
    await assert.rejects(() => confirmReviewPosted({ slug }));
    await prisma.reviewSession.update({
      where: { id: session.id },
      data: { status: "GOOGLE_CLICKED", clickedGoogle: false },
    });
    await assert.rejects(() => confirmReviewPosted({ slug }));
    await prisma.reviewSession.update({
      where: { id: session.id },
      data: { clickedGoogle: true },
    });
    cookie = undefined;
    await assert.rejects(() => confirmReviewPosted({ slug }));
    cookie = key + "." + "0".repeat(64);
    await assert.rejects(() => confirmReviewPosted({ slug }));
    const stranger = randomBytes(24).toString("hex");
    cookie = stranger + "." + sign(stranger);
    await assert.rejects(() => confirmReviewPosted({ slug }));
    cookie = key + "." + sign(key);
    await assert.rejects(() => confirmReviewPosted({ slug: "invalid" }));
    await assert.rejects(() =>
      confirmReviewPosted({ slug: randomBytes(12).toString("base64url") }),
    );
    const results = await Promise.all(
      Array.from({ length: 4 }, () => confirmReviewPosted({ slug })),
    );
    assert.ok(results[0].confirmedPostedAt instanceof Date);
    assert.ok(
      results.every(
        (r) =>
          r.confirmedPostedAt.getTime() ===
          results[0].confirmedPostedAt.getTime(),
      ),
    );
    const repeated = await confirmReviewPosted({ slug });
    assert.equal(
      repeated.confirmedPostedAt.getTime(),
      results[0].confirmedPostedAt.getTime(),
    );
    const saved = await prisma.reviewSession.findUniqueOrThrow({
      where: { id: session.id },
    });
    assert.equal(saved.status, "GOOGLE_CLICKED");
    assert.equal(saved.clickedGoogle, true);
    assert.equal(
      await prisma.reviewSession.count({ where: { qrCodeId: qr.id } }),
      1,
    );
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  }
});
