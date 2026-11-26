import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  requireMerchantUser,
  qrScope,
  assertLocationOwnership,
  assertQRCodeOwnership,
} from "@/lib/permissions";
import { qrCreateSchema, qrStatusSchema } from "@/lib/validations";
export async function listQRCodes() {
  const user = await requireMerchantUser();
  return prisma.qRCode.findMany({
    where: qrScope(user),
    include: {
      location: {
        select: { name: true, business: { select: { name: true } } },
      },
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
export async function createQRCode(input: unknown) {
  const data = qrCreateSchema.parse(input);
  const user = await requireMerchantUser();
  await assertLocationOwnership(data.locationId, user);
  return prisma.qRCode.create({
    data: { ...data, slug: randomBytes(12).toString("base64url") },
  });
}
export async function setQRCodeStatus(input: unknown) {
  const data = qrStatusSchema.parse(input);
  const user = await requireMerchantUser();
  await assertQRCodeOwnership(data.id, user);
  return prisma.qRCode.update({
    where: { id: data.id, ...qrScope(user) },
    data: { isActive: data.isActive },
  });
}
export async function resolvePublicQR(slug: string) {
  return prisma.qRCode.findUnique({
    where: { slug },
    select: {
      id: true, isActive: true,
      location: { select: {
        name: true,
        business: { select: {
          name: true, logoUrl: true,
          category: { select: {
            name: true,
            tags: { where: { isActive: true }, orderBy: { sortOrder: "asc" },
              select: { id: true, name: true, icon: true } },
          } },
        } },
      } },
    },
  });
}
