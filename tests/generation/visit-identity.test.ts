import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { mock, test } from "node:test";

process.env.AUTH_SECRET = "visit-test-secret-not-used-outside-this-test";
const sign = (key: string) => createHmac("sha256", process.env.AUTH_SECRET!).update(key).digest("hex");
let cookie: string | undefined;
await mock.module("next/headers", { namedExports: {
  cookies: async () => ({
    get: () => cookie ? { value: cookie } : undefined,
    set: (_name: string, value: string) => { cookie = value; },
  }),
} });
await mock.module("../../src/lib/rate-limit.ts", { namedExports: { rateLimit: async () => {}, requestAddress: async () => "test" } });
await mock.module("../../src/lib/prisma.ts", { namedExports: { prisma: {} } });
const { getVisitorKey } = await import("../../src/services/review-session.service");
test("visit identity is stable within a visit, separate across visits and bound to the signed cookie", async () => {
  const visit = randomUUID();
  const first = await getVisitorKey(true, visit);
  assert.equal(await getVisitorKey(false, visit), first);
  assert.notEqual(await getVisitorKey(false, randomUUID()), first);
  const otherKey = "b".repeat(48);
  cookie = otherKey + "." + sign(otherKey);
  assert.notEqual(await getVisitorKey(false, visit), first);
  cookie = otherKey + "." + "0".repeat(64);
  await assert.rejects(() => getVisitorKey(false, visit));
  await assert.rejects(() => getVisitorKey(true, "invalid"));
});
