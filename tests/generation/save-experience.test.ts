import assert from "node:assert/strict";
import { mock, test } from "node:test";
process.env.AUTH_SECRET = "test-secret";
let cookie: string | undefined;
await mock.module("next/headers", { namedExports: { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined, set: (_: string, v: string) => { cookie = v; } }) } });
await mock.module("../../src/lib/rate-limit.ts", { namedExports: { rateLimit: async () => {}, requestAddress: async () => "test" } });
let active = true;
let allowed = true;
let writes = 0;
let existing: { rating: number; selectedTags: string[]; status: string; clickedGoogle: boolean; confirmedPostedAt: null } | null = null;
const tx = {
  qRCode: { findUnique: async () => ({ id: "qr", isActive: active, location: { business: { category: { tags: allowed ? [{id: tag}] : [] } } } }) },
  reviewSession: {
    findUnique: async () => existing,
    upsert: async ({create, update}: {create: {rating: number; selectedTags: string[]; status: string; visitorKey: string}; update: {generatedReviews: string[]; reviewText: null}}) => {
      writes++;
      assert.match(create.visitorKey, /^[a-f0-9]{64}$/);
      assert.deepEqual(update.generatedReviews, []);
      assert.equal(update.reviewText, null);
      existing = {...create, clickedGoogle: false, confirmedPostedAt: null};
    },
  },
};
await mock.module("../../src/lib/prisma.ts", { namedExports: { prisma: { $transaction: async (fn: (client: typeof tx) => Promise<void>) => fn(tx) } } });
const { saveExperience } = await import("../../src/services/review-session.service");
const tag = "cllllllllllllllllllllllll";
const input = {slug: "abcdefghijklmnop", rating: 4, selectedTags: [tag]};
test("combined experience save validates category/QR and preserves unchanged generated reviews", async () => {
  await saveExperience(input);
  assert.equal(writes, 1);
  await saveExperience(input);
  assert.equal(writes, 1);
  await saveExperience({...input, rating: 3});
  assert.equal(writes, 2);
  allowed = false;
  await assert.rejects(() => saveExperience(input), /no longer available/);
  allowed = true;
  active = false;
  await assert.rejects(() => saveExperience(input), /unavailable/);
  active = true;
  existing!.clickedGoogle = true;
  await assert.rejects(() => saveExperience(input), /already completed/);
  await assert.rejects(() => saveExperience({...input, rating: 6}));
  assert.equal(writes, 2);
});
