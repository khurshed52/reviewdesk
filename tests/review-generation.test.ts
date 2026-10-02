import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generatedReviewsSchema,
  reviewGenerationInstructions,
} from "../src/lib/review-generation";
const valid = [
  "The service was good overall.",
  "I felt positive about the service.",
  "The service left a good impression.",
];
test("Generation output accepts only three to four short, distinct plain strings", () => {
  assert.deepEqual(generatedReviewsSchema.parse(valid), valid);
  for (const value of [
    [],
    valid.slice(0, 2),
    [
      ...valid,
      "A fourth distinct overall impression.",
      "A fifth distinct overall impression.",
    ],
    [...valid, ...valid],
    [valid[0], valid[0], valid[1]],
    ["# Great service", ...valid],
    ["**Great service**", ...valid],
    ["<b>Great service</b>", ...valid],
    ["Service\nwas good.", ...valid],
    ["a".repeat(401), ...valid],
    ["Nice ".repeat(66), ...valid],
    [{ text: "Great service" }, ...valid],
  ]) {
    assert.equal(generatedReviewsSchema.safeParse(value).success, false);
  }
});
test("Review instructions cover every rating and forbid unsupported specifics", () => {
  for (const phrase of [
    "5 = very positive",
    "4 = positive",
    "3 = mixed or neutral",
    "2 = mostly negative",
    "1 = clearly negative",
    "do not invent",
    "untrusted data",
  ])
    assert.ok(
      reviewGenerationInstructions.toLowerCase().includes(phrase.toLowerCase()),
    );
});
