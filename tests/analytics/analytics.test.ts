import "dotenv/config";
import assert from "node:assert/strict";
import { test, mock } from "node:test";
import { randomBytes } from "node:crypto";
import { prisma } from "../../src/lib/prisma";

let actorId: string | undefined;
await mock.module("next/navigation", {
  namedExports: {
    redirect: () => {
      throw new Error("Redirect");
    },
    notFound: () => {
      throw new Error("Not found");
    },
  },
});
await mock.module("../../src/lib/auth.ts", {
  namedExports: {
    auth: async () => (actorId ? { user: { id: actorId } } : null),
  },
});
const { getAnalytics } = await import("../../src/services/analytics.service");

test("analytics counts exact funnel stages and isolates merchants while admins see global totals", async () => {
  const userIds: string[] = [];
  let categoryId: string | undefined;
  const suffix = randomBytes(8).toString("hex");
  try {
    const admin = await prisma.user.create({
      data: { email: `analytics-admin-${suffix}@example.test`, role: "ADMIN" },
    });
    userIds.push(admin.id);
    actorId = admin.id;
    const baseline = await getAnalytics();
    const category = await prisma.category.create({
      data: { name: `Analytics ${suffix}`, slug: suffix },
    });
    categoryId = category.id;
    const makeMerchant = async (label: string, counts: number[]) => {
      const user = await prisma.user.create({
        data: {
          email: `analytics-${label}-${suffix}@example.test`,
          merchant: {
            create: {
              name: label,
              businesses: {
                create: {
                  name: label,
                  categoryId: category.id,
                  locations: {
                    create: counts.map((scans, index) => ({
                      name: `${label}-${index}`,
                      googleReviewUrl: "https://g.page/r/test/review",
                      qrCodes: {
                        create: {
                          name: `${label}-QR-${index}`,
                          slug: randomBytes(12).toString("base64url"),
                          scans: {
                            create: Array.from({ length: scans }, () => ({})),
                          },
                        },
                      },
                    })),
                  },
                },
              },
            },
          },
        },
        include: {
          merchant: {
            include: {
              businesses: {
                include: { locations: { include: { qrCodes: true } } },
              },
            },
          },
        },
      });
      userIds.push(user.id);
      return user;
    };
    const owner = await makeMerchant("owner", [6, 4]);
    const other = await makeMerchant("other", [20]);
    const ownerLocations = owner.merchant!.businesses[0].locations;
    const qr = ownerLocations[0].qrCodes[0];
    const otherQR = other.merchant!.businesses[0].locations[0].qrCodes[0];
    await prisma.reviewSession.createMany({
      data: [
        { qrCodeId: qr.id, visitorKey: "started", status: "STARTED" },
        { qrCodeId: qr.id, visitorKey: "rated", rating: 1, status: "RATED" },
        {
          qrCodeId: qr.id,
          visitorKey: "generated",
          rating: 2,
          status: "REVIEW_GENERATED",
          reviewText: "",
        },
        {
          qrCodeId: qr.id,
          visitorKey: "selected",
          rating: 3,
          status: "REVIEW_GENERATED",
          reviewText: "Selected review",
        },
        {
          qrCodeId: qr.id,
          visitorKey: "clicked",
          confirmedPostedAt: new Date(),
          rating: 4,
          status: "GOOGLE_CLICKED",
          reviewText: "Final review",
          clickedGoogle: true,
        },
        {
          qrCodeId: otherQR.id,
          visitorKey: "other",
          rating: 5,
          status: "GOOGLE_CLICKED",
          reviewText: "Other review",
          clickedGoogle: true,
        },
      ],
    });
    actorId = owner.id;
    const own = await getAnalytics();
    assert.deepEqual(
      [own.scans, own.ratings, own.generated, own.selected, own.clicks],
      [10, 4, 3, 2, 1],
    );
    assert.equal(own.confirmed, 1);
    assert.deepEqual(own.confirmedConversion, { scan: 10, googleClick: 100 });
    assert.deepEqual(own.funnel, {
      scanToRating: 40,
      ratingToGenerated: 75,
      generatedToSelected: (2 / 3) * 100,
      selectedToGoogle: 50,
      scanToGoogle: 10,
    });
    assert.deepEqual(
      own.topLocations.map((l) => l.scans),
      [6, 4],
    );
    assert.deepEqual(
      own.topQRCodes.map((q) => q._count.scans),
      [6, 4],
    );
    assert.equal(own.recent.length, 5);
    assert.ok(
      own.recent.every((r) => r.qrCode.location.business.name === "owner"),
    );
    assert.ok(
      own.recent.some((r) => r.status === "STARTED" && r.rating === null),
    );
    assert.ok(own.recent.every((r) => r.createdAt instanceof Date));
    actorId = other.id;
    const theirs = await getAnalytics();
    assert.deepEqual(
      [
        theirs.scans,
        theirs.ratings,
        theirs.generated,
        theirs.selected,
        theirs.clicks,
      ],
      [20, 1, 1, 1, 1],
    );
    assert.equal(theirs.confirmed, 0);
    assert.deepEqual(theirs.confirmedConversion, { scan: 0, googleClick: 0 });
    assert.equal(theirs.topQRCodes[0].id, otherQR.id);
    actorId = admin.id;
    const global = await getAnalytics();
    assert.equal(global.confirmed - baseline.confirmed, 1);
    assert.deepEqual(
      [
        global.scans - baseline.scans,
        global.ratings - baseline.ratings,
        global.generated - baseline.generated,
        global.selected - baseline.selected,
        global.clicks - baseline.clicks,
      ],
      [30, 5, 4, 3, 2],
    );
    const empty = await prisma.user.create({
      data: { email: `analytics-empty-${suffix}@example.test` },
    });
    userIds.push(empty.id);
    actorId = empty.id;
    const none = await getAnalytics();
    assert.deepEqual(
      [none.scans, none.ratings, none.generated, none.selected, none.clicks],
      [0, 0, 0, 0, 0],
    );
    assert.ok(Object.values(none.funnel).every((value) => value === 0));
    assert.equal(none.confirmed, 0);
    assert.deepEqual(none.confirmedConversion, { scan: 0, googleClick: 0 });
    assert.deepEqual(none.topLocations, []);
    assert.deepEqual(none.topQRCodes, []);
    assert.deepEqual(none.recent, []);
    actorId = undefined;
    await assert.rejects(() => getAnalytics());
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  }
});
