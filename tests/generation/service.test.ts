import assert from "node:assert/strict";
import { test, mock } from "node:test";

const reviews = [
  "The service was good overall.",
  "I felt positive about the service.",
  "The service left a good impression.",
];
let visitor = "owner";
let calls = 0;
let fail = false;
let concurrentChange = false;
let tagsAvailable = true;
const originalTime = new Date("2026-01-01");
const makeSession = () => ({
  id: "session",
  visitorKey: "owner",
  rating: 4,
  selectedTags: ["tag"],
  generatedReviews: [] as string[],
  reviewText: null as string | null,
  status: "TAGS_SELECTED",
  updatedAt: originalTime,
  qrCode: {
    isActive: true,
    slug: "abcdefghijklmnop",
    location: {
      name: "Test branch",
      business: {
        name: "Test",
        categoryId: "category",
        category: { name: "Cafe" },
      },
    },
  },
});
let session = makeSession();
await mock.module("../../src/lib/prisma.ts", {
  namedExports: {
    prisma: {
      reviewSession: {
        findFirst: async ({
          where,
        }: {
          where: {
            visitorKey: string;
            qrCode: { slug: string; isActive: boolean };
          };
        }) => {
          assert.equal(where.qrCode.isActive, true);
          return where.visitorKey === session.visitorKey &&
            where.qrCode.slug === session.qrCode.slug
            ? structuredClone(session)
            : null;
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: {
            visitorKey: string;
            updatedAt?: Date;
            generatedReviews?: { has: string };
            status?: string;
            qrCode: { isActive: boolean };
          };
          data: Partial<typeof session>;
        }) => {
          assert.equal(where.qrCode.isActive, true);
          if (
            where.visitorKey !== session.visitorKey ||
            (where.updatedAt &&
              where.updatedAt.getTime() !== session.updatedAt.getTime()) ||
            (where.generatedReviews &&
              !session.generatedReviews.includes(where.generatedReviews.has))
          )
            return { count: 0 };
          session = { ...session, ...data, updatedAt: new Date() };
          return { count: 1 };
        },
      },
      reviewTag: {
        findMany: async ({
          where,
        }: {
          where: {
            id: { in: string[] };
            categoryId: string;
            isActive: boolean;
          };
        }) => {
          assert.equal(where.categoryId, "category");
          assert.equal(where.isActive, true);
          assert.deepEqual(where.id.in, ["tag"]);
          return tagsAvailable ? [{ name: "Service" }] : [];
        },
      },
    },
  },
});
await mock.module("../../src/services/review-session.service.ts", {
  namedExports: { getVisitorKey: async () => visitor },
});
await mock.module("../../src/lib/rate-limit.ts", {
  namedExports: {
    rateLimit: async () => {},
    requestAddress: async () => "test",
  },
});
await mock.module("../../src/lib/groq.ts", {
  namedExports: {
    generateGroqReviews: async (input: {
      rating: number;
      tagNames: string[];
      locationName: string;
    }) => {
      calls++;
      assert.equal(input.rating, 4);
      assert.deepEqual(input.tagNames, ["Service"]);
      assert.equal(input.locationName, "Test branch");
      if (fail) throw new Error("Provider failed");
      if (concurrentChange) session.updatedAt = new Date("2027-01-01");
      return reviews;
    },
  },
});
const { generateReviewSuggestions, selectReviewSuggestion } =
  await import("../../src/services/review-generation.service");
const input = { slug: "abcdefghijklmnop" };
test("generation saves once, uses cache, preserves failures, checks ownership and stale writes", async () => {
  assert.deepEqual(await generateReviewSuggestions(input), reviews);
  assert.equal(session.status, "REVIEW_GENERATED");
  assert.equal(calls, 1);
  assert.deepEqual(await generateReviewSuggestions(input), reviews);
  assert.equal(calls, 1);
  await selectReviewSuggestion({ ...input, reviewText: reviews[0] });
  assert.equal(session.reviewText, reviews[0]);
  await assert.rejects(() =>
    selectReviewSuggestion({
      ...input,
      reviewText: "An invented review that was not generated.",
    }),
  );
  fail = true;
  await assert.rejects(() =>
    generateReviewSuggestions({ ...input, regenerate: true }),
  );
  assert.deepEqual(session.generatedReviews, reviews);
  assert.equal(session.reviewText, reviews[0]);
  visitor = "stranger";
  await assert.rejects(() => generateReviewSuggestions(input));
  await assert.rejects(() =>
    selectReviewSuggestion({ ...input, reviewText: reviews[0] }),
  );
  visitor = "owner";
  fail = false;
  concurrentChange = true;
  session = makeSession();
  await assert.rejects(() => generateReviewSuggestions(input));
  assert.deepEqual(session.generatedReviews, []);
  concurrentChange = false;
  session = makeSession();
  session.selectedTags = [];
  await assert.rejects(
    () => generateReviewSuggestions(input),
    /select one to three tags/,
  );
  session = makeSession();
  tagsAvailable = false;
  await assert.rejects(
    () => generateReviewSuggestions(input),
    /no longer available/,
  );
  assert.deepEqual(session.generatedReviews, []);
  tagsAvailable = true;
  session.status = "STARTED";
  await assert.rejects(() => generateReviewSuggestions(input));
});
