import { notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  requireMerchant,
  requireMerchantUser,
  businessScope,
  assertBusinessOwnership,
} from "@/lib/permissions";
import {
  businessCreateSchema,
  businessUpdateSchema,
  idSchema,
} from "@/lib/validations";
export async function listBusinesses() {
  const user = await requireUser();
  const rows = await prisma.business.findMany({
    where: businessScope(user),
    include: {
      category: { select: { name: true } },
      _count: { select: { locations: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({ ...row, category: row.category.name }));
}
export async function getBusiness(id: string) {
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireUser();
  await assertBusinessOwnership(idSchema.parse(id), user);
  const row = await prisma.business.findFirstOrThrow({
    where: { id, ...businessScope(user) },
    include: { category: { select: { name: true } } },
  });
  return { ...row, category: row.category.name };
}
export async function createBusiness(input: unknown) {
  const { category, ...data } = businessCreateSchema.parse(input);
  const merchant = await requireMerchant();
  const categoryId = await resolveCategory(category);
  return prisma.business.create({
    data: { ...data, categoryId, merchantId: merchant.id },
  });
}
export async function updateBusiness(id: string, input: unknown) {
  const { category, ...data } = businessUpdateSchema.parse(input);
  const user = await requireMerchantUser();
  await assertBusinessOwnership(idSchema.parse(id), user);
  return prisma.business.update({
    where: { id, ...businessScope(user) },
    data: { ...data, categoryId: await resolveCategory(category) },
  });
}
export async function deleteBusiness(id: string) {
  const user = await requireMerchantUser();
  await assertBusinessOwnership(idSchema.parse(id), user);
  return prisma.business.delete({ where: { id, ...businessScope(user) } });
}

async function resolveCategory(name: string) {
  const category = await prisma.category.findFirst({
    where: { name, isActive: true },
    select: { id: true },
  });
  if (!category) throw new AppError("This category is unavailable");
  return category.id;
}
