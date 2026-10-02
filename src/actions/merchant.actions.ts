"use server";
import { createMerchant } from "@/services/merchant.service";
import { mutate } from "./helpers";

export async function createMerchantAction(input: unknown) {
  return mutate(() => createMerchant(input));
}
