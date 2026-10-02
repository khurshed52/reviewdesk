import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  requireMerchantUser,
  locationScope,
  assertBusinessOwnership,
  assertLocationOwnership,
} from "@/lib/permissions";
import {
  locationCreateSchema,
  locationUpdateSchema,
  idSchema,
} from "@/lib/validations";
export async function listLocations() {
  const user = await requireMerchantUser();
  return prisma.location.findMany({
    where: locationScope(user),
    include: {
      business: { select: { id: true, name: true } },
      _count: { select: { qrCodes: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
export async function getLocation(id: string) {
  if (!idSchema.safeParse(id).success) notFound();
  const user = await requireMerchantUser();
  return assertLocationOwnership(idSchema.parse(id), user);
}
export async function createLocation(input: unknown) {
  const data = locationCreateSchema.parse(input);
  const user = await requireMerchantUser();
  await assertBusinessOwnership(data.businessId, user);
  return prisma.location.create({ data });
}
export async function updateLocation(id: string, input: unknown) {
  const data = locationUpdateSchema.parse(input);
  const user = await requireMerchantUser();
  const existing = await assertLocationOwnership(idSchema.parse(id), user);
  await assertBusinessOwnership(data.businessId, user); // Location identity stays tied to its business once QR codes exist.
  if (existing.businessId !== data.businessId) {
    const { AppError } = await import("@/lib/errors");
    throw new AppError("A location cannot be moved to another business");
  }
  return prisma.location.update({
    where: { id, ...locationScope(user) },
    data,
  });
}
export async function deleteLocation(id: string) {
  const user = await requireMerchantUser();
  await assertLocationOwnership(idSchema.parse(id), user);
  return prisma.location.delete({ where: { id, ...locationScope(user) } });
}
