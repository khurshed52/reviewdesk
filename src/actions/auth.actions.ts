"use server";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { registerMerchant } from "@/services/merchant.service";
import { mutate } from "./helpers";
import { loginSchema } from "@/lib/validations";
import { rateLimit, requestAddress } from "@/lib/rate-limit";
export async function registerAction(input: unknown) {
  return mutate(async () => {
    await rateLimit("register", await requestAddress(), 10, 3600);
    await registerMerchant(input);
  });
}
export async function loginAction(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false as const,
      error: "Enter a valid email and password",
    };
  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError)
      return {
        success: false as const,
        error: "Unable to sign in. Check your credentials or try again later.",
      };
    throw error;
  }
  return { success: true as const };
}
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
