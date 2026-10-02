import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
export class AppError extends Error {}
export class AITransientError extends AppError {}
export function publicError(error: unknown): string {
  if (error instanceof ZodError)
    return error.issues[0]?.message ?? "Invalid input";
  if (error instanceof AppError) return error.message;
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return "This record already exists";
  console.error("Request failed", error);
  return "Something went wrong. Please try again.";
}
