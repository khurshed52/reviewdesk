import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  reviewSchema,
  reviewTagsSchema,
  finalReviewSchema,
  googleReviewUrlSchema,
} from "@/lib/validations";
import { AppError } from "@/lib/errors";
import { rateLimit, requestAddress } from "@/lib/rate-limit";
function signed(value: string) {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is required");
  return createHmac("sha256", process.env.AUTH_SECRET)
    .update(value)
    .digest("hex");
}
export async function getVisitorKey(create: boolean) {
  const jar = await cookies();
  const stored = jar.get("reviewdesk-visitor")?.value;
  if (stored) {
    const [key, signature] = stored.split(".");
    if (
      key &&
      /^[a-f0-9]{48}$/.test(key) &&
      signature &&
      /^[a-f0-9]{64}$/.test(signature) &&
      timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(signed(key), "hex"),
      )
    )
      return signed(`visitor:${key}`);
  }
  if (!create) throw new AppError("Please select a rating first");
  const key = randomBytes(24).toString("hex");
  jar.set("reviewdesk-visitor", `${key}.${signed(key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return signed(`visitor:${key}`);
}
export async function saveRating(input: unknown) {
  const { slug, rating } = reviewSchema.parse(input);
  await rateLimit("review-ip", await requestAddress(), 120, 3600);
  const visitorKey = await getVisitorKey(true);
  return prisma.$transaction(async (tx) => {
    const qr = await tx.qRCode.findUnique({
      where: { slug },
      select: { id: true, isActive: true },
    });
    if (!qr?.isActive) throw new AppError("This review link is unavailable");
    const existing = await tx.reviewSession.findUnique({
      where: { qrCodeId_visitorKey: { qrCodeId: qr.id, visitorKey } },
      select: { rating: true },
    });
    await tx.reviewSession.upsert({
      where: { qrCodeId_visitorKey: { qrCodeId: qr.id, visitorKey } },
      create: { qrCodeId: qr.id, visitorKey, rating, status: "RATED" },
      update:
        existing?.rating === rating
          ? {}
          : {
              rating,
              status: "RATED",
              selectedTags: [],
              generatedReviews: [],
              reviewText: null,
            },
      select: { id: true },
    });
  });
}

export async function saveSelectedTags(input: unknown) {
  const { slug, selectedTags } = reviewTagsSchema.parse(input);
  const visitorKey = await getVisitorKey(false);
  await rateLimit("review-tags-ip", await requestAddress(), 120, 3600);
  return prisma.$transaction(async (tx) => {
    const qr = await tx.qRCode.findUnique({
      where: { slug },
      select: {
        id: true,
        isActive: true,
        location: {
          select: {
            business: {
              select: {
                category: {
                  select: {
                    tags: {
                      where: { isActive: true, id: { in: selectedTags } },
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!qr?.isActive) throw new AppError("This review link is unavailable");
    if (qr.location.business.category.tags.length !== selectedTags.length)
      throw new AppError(
        "Some tags are unavailable. Select your rating again to refresh the choices.",
      );
    const existing = await tx.reviewSession.findUnique({
      where: { qrCodeId_visitorKey: { qrCodeId: qr.id, visitorKey } },
      select: { selectedTags: true },
    });
    const unchanged =
      existing?.selectedTags.length === selectedTags.length &&
      selectedTags.every((id) => existing.selectedTags.includes(id));
    const result = await tx.reviewSession.updateMany({
      where: {
        qrCodeId: qr.id,
        visitorKey,
        rating: { not: null },
        status: { in: ["RATED", "TAGS_SELECTED", "REVIEW_GENERATED"] },
      },
      data: unchanged
        ? { selectedTags }
        : {
            selectedTags,
            status: "TAGS_SELECTED",
            generatedReviews: [],
            reviewText: null,
          },
    });
    if (!result.count) throw new AppError("Please select a rating first");
  });
}

// Save the final text and click marker atomically; never create a new session.
export async function saveReviewForGoogle(input: unknown) {
  const { slug, reviewText } = finalReviewSchema.parse(input);
  const visitorKey = await getVisitorKey(false);
  return prisma.$transaction(async (tx) => {
    const session = await tx.reviewSession.findFirst({
      where: {
        visitorKey,
        qrCode: { slug, isActive: true },
        status: { in: ["REVIEW_GENERATED", "GOOGLE_CLICKED"] },
        reviewText: { not: null },
      },
      select: {
        id: true,
        updatedAt: true,
        qrCode: { select: { location: { select: { googleReviewUrl: true } } } },
      },
    });
    if (!session)
      throw new AppError("Please select a review before continuing.");
    const url = googleReviewUrlSchema.safeParse(
      session.qrCode.location.googleReviewUrl,
    );
    if (!url.success)
      throw new AppError("This location's Google review link is unavailable.");
    const result = await tx.reviewSession.updateMany({
      where: {
        id: session.id,
        visitorKey,
        updatedAt: session.updatedAt,
        qrCode: { slug, isActive: true },
        status: { in: ["REVIEW_GENERATED", "GOOGLE_CLICKED"] },
        reviewText: { not: null },
      },
      data: { reviewText, clickedGoogle: true, status: "GOOGLE_CLICKED" },
    });
    if (!result.count)
      throw new AppError("Your review changed. Please try again.");
    return { googleReviewUrl: url.data, reviewText };
  });
}
