import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
export async function requestAddress() {
  const h = await headers();
  return process.env.TRUST_PROXY === "true"
    ? h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "local";
}
export async function rateLimit(
  scope: string,
  identity: string,
  limit: number,
  seconds: number,
) {
  const key = createHash("sha256").update(`${scope}:${identity}`).digest("hex");
  const rows = await prisma.$queryRaw<{ count: number }[]>`
 INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${key}, 1, NOW() + ${seconds} * INTERVAL '1 second')
 ON CONFLICT ("key") DO UPDATE SET
 "count" = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
 "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN NOW() + ${seconds} * INTERVAL '1 second' ELSE "RateLimit"."expiresAt" END
 RETURNING "count"`;
  if (rows[0].count > limit)
    throw new AppError("Too many attempts. Please try again later.");
}
