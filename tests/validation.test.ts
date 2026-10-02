import assert from "node:assert/strict";
import { test } from "node:test";
import {
  registrationSchema,
  googleReviewUrlSchema,
  reviewSchema,
  businessCreateSchema,
} from "../src/lib/validations";
test("Google links reject unsafe protocols and lookalike hosts", () => {
  for (const url of [
    "javascript:alert(1)",
    "http://google.com/maps",
    "https://google.com.attacker.test/maps",
    "https://attacker.test",
    "https://www.google.com/url?q=https://attacker.test",
    "https://user:pass@google.com/maps",
  ])
    assert.equal(googleReviewUrlSchema.safeParse(url).success, false);
  assert.equal(
    googleReviewUrlSchema.safeParse("https://g.page/r/example/review").success,
    true,
  );
});
test("Registration validates confirmation and bcrypt byte limit", () => {
  const base = {
    name: "Merchant",
    companyName: "Coffee Co",
    email: " OWNER@EXAMPLE.COM ",
    password: "a-long-password",
    confirmPassword: "a-long-password",
  };
  assert.equal(
    registrationSchema.safeParse({ ...base, email: "OWNER@EXAMPLE.COM" })
      .success,
    true,
  );
  assert.equal(
    registrationSchema.safeParse({ ...base, confirmPassword: "wrong" }).success,
    false,
  );
  assert.equal(
    registrationSchema.safeParse({
      ...base,
      password: "😀".repeat(30),
      confirmPassword: "😀".repeat(30),
    }).success,
    false,
  );
});
test("Ratings are constrained and QR slugs are opaque", () => {
  for (const rating of [0, 6, 1.5])
    assert.equal(
      reviewSchema.safeParse({ slug: "abcdefghijklmnop", rating }).success,
      false,
    );
  assert.equal(
    reviewSchema.safeParse({ slug: "abcdefghijklmnop", rating: 5 }).success,
    true,
  );
});
test("Business input strips forged merchant identity", () => {
  const data = businessCreateSchema.parse({
    name: "Coffee",
    category: "Cafe",
    merchantId: "attacker",
  });
  assert.equal("merchantId" in data, false);
});

test("Optional logo remains editable when blank and invalid URLs fail validation", () => {
  assert.equal(
    businessCreateSchema.safeParse({
      name: "Coffee",
      category: "Cafe",
      logoUrl: "",
    }).success,
    true,
  );
  assert.equal(googleReviewUrlSchema.safeParse("not a URL").success, false);
});

test("Tag selections require one to three distinct valid IDs", async () => {
  const { reviewTagsSchema } = await import("../src/lib/validations");
  const ids = [
    "cmuk98xpg00000yzy3954aigp",
    "cmuk98xpj00010yzy67ktwxlh",
    "cmuk4l9fp0001t7zy1mj69z75",
    "cmuk4l9fg0000t7zysowujj2c",
  ];
  const parse = (selectedTags: string[]) =>
    reviewTagsSchema.safeParse({ slug: "abcdefghijklmnop", selectedTags })
      .success;
  assert.equal(parse(ids.slice(0, 3)), true);
  assert.equal(parse([]), false);
  assert.equal(parse(ids), false);
  assert.equal(parse([ids[0], ids[0]]), false);
  assert.equal(parse(["invalid"]), false);
});
