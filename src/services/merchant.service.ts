import { notFound } from "next/navigation";
import { hash } from "bcrypt";
import { prisma } from "@/lib/prisma";
import { registrationSchema } from "@/lib/validations";
import { AppError } from "@/lib/errors";
import { requireAdmin } from "@/lib/permissions";
export async function registerMerchant(input: unknown) {
  const data = registrationSchema.parse(input);
  if (
    await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    })
  )
    throw new AppError("An account with this email already exists");
  const passwordHash = await hash(data.password, 12);
  // Prisma nested writes create the user and merchant in one transaction.
  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: "MERCHANT",
      merchant: { create: { name: data.companyName } },
    },
    select: { id: true, merchant: { select: { id: true } } },
  });
}
export async function listMerchants() {
  await requireAdmin();
  return prisma.merchant.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      owner: { select: { email: true } },
      _count: { select: { businesses: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createMerchant(input: unknown) {
  await requireAdmin();
  return registerMerchant(input);
}

export async function getMerchant(id: string) {
  await requireAdmin();
  const { idSchema } = await import("@/lib/validations");
  if (!idSchema.safeParse(id).success) notFound();
  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true, email: true } },
      businesses: {
        include: {
          category: { select: { name: true } },
          _count: { select: { locations: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!merchant) notFound();
  return merchant;
}
