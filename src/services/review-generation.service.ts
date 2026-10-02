import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { slugSchema } from "@/lib/validations";
import { generatedReviewsSchema } from "@/lib/review-generation";
import { generateGroqReviews } from "@/lib/groq";
import { rateLimit, requestAddress } from "@/lib/rate-limit";
import { getVisitorKey } from "@/services/review-session.service";

const generationSchema = z.object({
  slug: slugSchema,
  regenerate: z.boolean().default(false),
});

export async function generateReviewSuggestions(input: unknown) {
  const { slug, regenerate } = generationSchema.parse(input);
  const visitorKey = await getVisitorKey(false);
  const session = await prisma.reviewSession.findFirst({
    where: { visitorKey, qrCode: { slug, isActive: true } },
    include: {
      qrCode: {
        include: {
          location: { include: { business: { include: { category: true } } } },
        },
      },
    },
  });
  if (
    !session ||
    !session.rating ||
    !["RATED", "TAGS_SELECTED", "REVIEW_GENERATED"].includes(session.status)
  )
    throw new AppError("Please save your rating first.");
  const cached = generatedReviewsSchema.safeParse(session.generatedReviews);
  if (!regenerate && cached.success) return cached.data;
  const business = session.qrCode.location.business;
  const tagIds = [...new Set(session.selectedTags)];
  if (
    tagIds.length < 1 ||
    tagIds.length > 3 ||
    tagIds.length !== session.selectedTags.length
  )
    throw new AppError("Please select one to three tags first.");
  const tags = await prisma.reviewTag.findMany({
    where: {
      id: { in: tagIds },
      categoryId: business.categoryId,
      isActive: true,
    },
    select: { name: true },
    orderBy: { sortOrder: "asc" },
  });
  if (tags.length !== tagIds.length)
    throw new AppError(
      "Some selected tags are no longer available. Please choose again.",
    );
  await rateLimit("review-generation-visitor", visitorKey, 10, 3600);
  await rateLimit("review-generation-ip", await requestAddress(), 60, 3600);
  const reviews = await generateGroqReviews({
    rating: session.rating,
    tagNames: tags.map((tag) => tag.name),
    locationName: session.qrCode.location.name,
    businessName: business.name,
    category: business.category.name,
  });
  // Optimistic concurrency: a slow response cannot overwrite a newer rating,
  // tag selection, suggestion choice, or another generation result.
  const saved = await prisma.reviewSession.updateMany({
    where: {
      id: session.id,
      visitorKey,
      updatedAt: session.updatedAt,
      qrCode: { isActive: true },
    },
    data: {
      generatedReviews: reviews,
      reviewText: null,
      status: "REVIEW_GENERATED",
    },
  });
  if (!saved.count)
    throw new AppError(
      "Your review changed while generating. Please try again.",
    );
  return reviews;
}

export async function selectReviewSuggestion(input: unknown) {
  const { slug, reviewText } = z
    .object({ slug: slugSchema, reviewText: z.string().min(10).max(400) })
    .parse(input);
  const visitorKey = await getVisitorKey(false);
  const result = await prisma.reviewSession.updateMany({
    where: {
      visitorKey,
      status: "REVIEW_GENERATED",
      qrCode: { slug, isActive: true },
      generatedReviews: { has: reviewText },
    },
    data: { reviewText },
  });
  if (!result.count)
    throw new AppError(
      "This suggestion is no longer available. Please reload your suggestions.",
    );
}
