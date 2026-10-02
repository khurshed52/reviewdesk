import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mock, test } from "node:test";

const key = "a".repeat(48);
process.env.AUTH_SECRET = "final-review-test-secret";
const sign = (value: string) =>
  createHmac("sha256", process.env.AUTH_SECRET!).update(value).digest("hex");
let cookie: string | undefined = key + "." + sign(key);
let available = true;
let updated = true;
let failWrite = false;
let url = "https://g.page/r/test/review";
let writes = 0;
await mock.module("next/headers", {
  namedExports: {
    headers: async () => new Headers(),
    cookies: async () => ({
      get: () => (cookie ? { value: cookie } : undefined),
    }),
  },
});
await mock.module("../../src/lib/prisma.ts", {
  namedExports: {
    prisma: {
      $transaction: async (fn: (tx: unknown) => unknown) =>
        fn({
          reviewSession: {
            findFirst: async ({
              where,
            }: {
              where: Record<string, unknown>;
            }) => {
              assert.equal(where.visitorKey, sign("visitor:" + key));
              assert.deepEqual(where.qrCode, {
                slug: "abcdefghijklmnop",
                isActive: true,
              });
              assert.deepEqual(where.status, {
                in: ["REVIEW_GENERATED", "GOOGLE_CLICKED"],
              });
              assert.deepEqual(where.reviewText, { not: null });
              return available
                ? {
                    id: "existing-session",
                    updatedAt: new Date(0),
                    qrCode: { location: { googleReviewUrl: url } },
                  }
                : null;
            },
            updateMany: async ({
              where,
              data,
            }: {
              where: Record<string, unknown>;
              data: unknown;
            }) => {
              writes++;
              assert.equal(where.id, "existing-session");
              assert.equal(where.visitorKey, sign("visitor:" + key));
              assert.deepEqual(where.updatedAt, new Date(0));
              assert.deepEqual(where.qrCode, {
                slug: "abcdefghijklmnop",
                isActive: true,
              });
              assert.deepEqual(data, {
                reviewText: "My edited review.",
                clickedGoogle: true,
                status: "GOOGLE_CLICKED",
              });
              if (failWrite) throw new Error("Database unavailable");
              return { count: updated ? 1 : 0 };
            },
          },
        }),
    },
  },
});
const { saveReviewForGoogle } =
  await import("../../src/services/review-session.service");
test("final review validates ownership, URL and text, and saves all fields together", async () => {
  const input = {
    slug: "abcdefghijklmnop",
    reviewText: "  My edited review.  ",
  };
  assert.deepEqual(await saveReviewForGoogle(input), {
    googleReviewUrl: url,
    reviewText: "My edited review.",
  });
  assert.equal(writes, 1);
  await assert.rejects(() =>
    saveReviewForGoogle({ ...input, reviewText: "  " }),
  );
  await assert.rejects(() =>
    saveReviewForGoogle({ ...input, reviewText: "x".repeat(4001) }),
  );
  cookie = undefined;
  await assert.rejects(() => saveReviewForGoogle(input));
  cookie = key + "." + "b".repeat(64);
  await assert.rejects(() => saveReviewForGoogle(input));
  cookie = key + "." + sign(key);
  available = false;
  await assert.rejects(() => saveReviewForGoogle(input), /select a review/);
  available = true;
  url = "https://evil.example/review";
  await assert.rejects(() => saveReviewForGoogle(input), /link is unavailable/);
  assert.equal(writes, 1);
  url = "https://g.page/r/test/review";
  updated = false;
  await assert.rejects(() => saveReviewForGoogle(input), /review changed/);
  updated = true;
  failWrite = true;
  await assert.rejects(
    () => saveReviewForGoogle(input),
    /Database unavailable/,
  );
});
