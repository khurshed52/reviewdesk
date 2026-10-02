import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      merchant: { select: { id: true, name: true } },
    },
  });
  return user;
}
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
export type Actor = Awaited<ReturnType<typeof requireUser>>;
export async function requireMerchantUser() {
  const user = await requireUser();
  if (user.role !== "MERCHANT") redirect("/unauthorized");
  return user;
}
export async function requireMerchant() {
  const user = await requireMerchantUser();
  if (!user.merchant) throw new AppError("A merchant account is required");
  return user.merchant;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/unauthorized");
  return user;
}
export function businessScope(user: Actor) {
  return user.role === "ADMIN"
    ? {}
    : { merchantId: user.merchant?.id ?? "__none__" };
}
export function locationScope(user: Actor) {
  return { business: businessScope(user) };
}
export function qrScope(user: Actor) {
  return { location: locationScope(user) };
}
export async function assertBusinessOwnership(id: string, user: Actor) {
  const item = await prisma.business.findFirst({
    where: { id, ...businessScope(user) },
  });
  if (!item) notFound();
  return item;
}
export async function assertLocationOwnership(id: string, user: Actor) {
  const item = await prisma.location.findFirst({
    where: { id, ...locationScope(user) },
  });
  if (!item) notFound();
  return item;
}
export async function assertQRCodeOwnership(id: string, user: Actor) {
  const item = await prisma.qRCode.findFirst({
    where: { id, ...qrScope(user) },
  });
  if (!item) notFound();
  return item;
}
