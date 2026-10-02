import assert from "node:assert/strict";
import { test, mock } from "node:test";

const reviews = [
  "My overall experience was positive.",
  "I was pleased with my experience overall.",
  "Overall, this was a good experience for me.",
];
const success = {
  choices: [
    {
      finish_reason: "stop",
      message: { content: JSON.stringify({ reviews }) },
    },
  ],
};
let outcomes: unknown[] = [];
let calls = 0;
let models: string[] = [];
let waits: number[] = [];
await mock.module("node:timers/promises", {
  namedExports: {
    setTimeout: async (ms: number) => {
      waits.push(ms);
    },
  },
});
await mock.module("groq-sdk", {
  defaultExport: class {
    constructor(options: { maxRetries: number; timeout: number }) {
      assert.equal(options.maxRetries, 0);
      assert.equal(options.timeout, 30000);
    }
    chat = {
      completions: {
        create: async (options: {
          model: string;
          response_format: { type: string };
          messages: { content: string }[];
        }) => {
          models.push(options.model);
          assert.equal(options.model, "openai/gpt-oss-20b");
          assert.equal(options.response_format.type, "json_object");
          assert.deepEqual(JSON.parse(options.messages[1].content), input);
          calls++;
          const outcome = outcomes.shift();
          if (outcome instanceof Error) throw outcome;
          return outcome;
        },
      },
    };
  },
});
const { generateGroqReviews } = await import("../../src/lib/groq");
const input = {
  rating: 4,
  tagNames: ["Service"],
  businessName: "Test business",
  category: "Cafe",
  locationName: "Test branch",
};
const apiError = (status: number) =>
  Object.assign(new Error("Provider error"), { status });
const reset = (...results: unknown[]) => {
  outcomes = results;
  calls = 0;
  models = [];
  waits = [];
};
test("Groq retries only transient errors with two bounded backoffs", async () => {
  const previousKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-only-key";
  try {
    reset(apiError(503), apiError(503), success);
    assert.deepEqual(await generateGroqReviews(input), reviews);
    assert.equal(calls, 3);
    assert.deepEqual(waits, [1000, 2000]);
    reset(apiError(429), success);
    assert.deepEqual(await generateGroqReviews(input), reviews);
    assert.equal(calls, 2);
    assert.deepEqual(waits, [1000]);
    for (const [status, message] of [
      [503, "AI is busy right now. Please try again."],
      [429, "AI usage limit reached. Please try again shortly."],
    ] as const) {
      reset(...Array.from({ length: 3 }, () => apiError(status)));
      await assert.rejects(() => generateGroqReviews(input), { message });
      assert.equal(calls, 3);
      assert.deepEqual(waits, [1000, 2000]);
    }
    for (const failure of [
      apiError(400),
      apiError(401),
      apiError(403),
      apiError(404),
      apiError(500),
      new Error("API_KEY_INVALID"),
      new Error("timeout"),
      {
        choices: [{ finish_reason: "stop", message: { content: "not JSON" } }],
      },
      {
        choices: [
          {
            finish_reason: "stop",
            message: { content: '{"reviews":["too few"]}' },
          },
        ],
      },
      {
        choices: [
          {
            finish_reason: "length",
            message: { content: JSON.stringify({ reviews }) },
          },
        ],
      },
    ]) {
      reset(failure);
      await assert.rejects(
        () => generateGroqReviews(input),
        /Could not generate review suggestions/,
      );
      assert.equal(calls, 1);
      assert.deepEqual(waits, []);
    }
    reset(apiError(503), apiError(400));
    await assert.rejects(
      () => generateGroqReviews(input),
      /Could not generate review suggestions/,
    );
    assert.equal(calls, 2);
    assert.deepEqual(waits, [1000]);
  } finally {
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  }
});
