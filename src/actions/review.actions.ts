"use server";
import {
  confirmReviewPosted,
  saveRating,
  saveReviewForGoogle,
  saveSelectedTags,
} from "@/services/review-session.service";
import { publicError, AITransientError } from "@/lib/errors";
export async function saveRatingAction(input: unknown) {
  try {
    await saveRating(input);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: publicError(error) };
  }
}

export async function saveTagsAction(input: unknown) {
  try {
    await saveSelectedTags(input);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: publicError(error) };
  }
}

export async function generateReviewsAction(input: unknown) {
  try {
    const { generateReviewSuggestions } =
      await import("@/services/review-generation.service");
    return {
      success: true as const,
      reviews: await generateReviewSuggestions(input),
    };
  } catch (error) {
    return {
      success: false as const,
      error: publicError(error),
      transient: error instanceof AITransientError,
    };
  }
}
export async function selectReviewAction(input: unknown) {
  try {
    const { selectReviewSuggestion } =
      await import("@/services/review-generation.service");
    await selectReviewSuggestion(input);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: publicError(error) };
  }
}

export async function continueToGoogleAction(input: unknown) {
  try {
    const result = await saveReviewForGoogle(input);
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: publicError(error) };
  }
}

export async function confirmReviewPostedAction(input: unknown) {
  try {
    const result = await confirmReviewPosted(input);
    return {
      success: true as const,
      confirmedPostedAt: result.confirmedPostedAt.toISOString(),
    };
  } catch (error) {
    return { success: false as const, error: publicError(error) };
  }
}
