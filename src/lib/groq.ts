import "server-only";

import { setTimeout as delay } from "node:timers/promises";
import Groq from "groq-sdk";

import { AppError, AITransientError } from "@/lib/errors";
import {
  generatedReviewsSchema,
  reviewGenerationInstructions,
  type ReviewGenerationInput,
} from "@/lib/review-generation";

export const GROQ_MODEL = "openai/gpt-oss-20b";

export async function generateGroqReviews(
  input: ReviewGenerationInput,
): Promise<string[]> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new AppError(
      "Review suggestions are not configured yet. Please try again later.",
    );
  }

  try {
    const ai = new Groq({ apiKey, timeout: 30000, maxRetries: 0 });

    // Three total attempts, with retries controlled here rather than by the SDK.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: reviewGenerationInstructions },
            { role: "user", content: JSON.stringify(input) },
          ],
          response_format: { type: "json_object" },
          temperature: 0.65,
          max_completion_tokens: 1500,
        });
        const choice = response.choices[0];
        if (choice?.finish_reason !== "stop" || !choice.message.content) {
          throw new Error("Groq returned an incomplete response.");
        }
        const parsed: unknown = JSON.parse(choice.message.content);
        const envelope = parsed as { reviews?: unknown } | null;
        return generatedReviewsSchema.parse(envelope?.reviews);
      } catch (error) {
        const status =
          typeof error === "object" && error !== null && "status" in error
            ? error.status
            : undefined;
        if (status !== 503 && status !== 429) throw error;
        if (attempt === 2) {
          throw new AITransientError(
            status === 503
              ? "AI is busy right now. Please try again."
              : "AI usage limit reached. Please try again shortly.",
          );
        }
        await delay((attempt + 1) * 1000);
      }
    }
    throw new Error("Generation attempts exhausted.");
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Never log provider errors or response bodies; they may include sensitive data.
    throw new AppError(
      "Could not generate review suggestions. Please try again. Your saved suggestions have not changed.",
    );
  }
}
