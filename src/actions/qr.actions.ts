"use server";
import { createQRCode, setQRCodeStatus } from "@/services/qr.service";
import { mutate } from "./helpers";
export async function createQRAction(input: unknown) {
  return mutate(() => createQRCode(input));
}
export async function setQRStatusAction(input: unknown) {
  return mutate(() => setQRCodeStatus(input));
}
