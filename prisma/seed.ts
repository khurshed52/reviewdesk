import { seedCategoryCatalog } from "./category-catalog";
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { hash } from "bcrypt";
import { prisma } from "../src/lib/prisma";
import { emailSchema, passwordSchema } from "../src/lib/validations";

async function main() {
  await prisma.$transaction(seedCategoryCatalog, { maxWait: 15000, timeout: 60000 });
  const adminEmail = emailSchema.parse(process.env.SEED_ADMIN_EMAIL);
  const merchantEmail = emailSchema.parse(process.env.SEED_MERCHANT_EMAIL);

  const adminPassword = passwordSchema.parse(
    process.env.SEED_ADMIN_PASSWORD,
  );

  const merchantPassword = passwordSchema.parse(
    process.env.SEED_MERCHANT_PASSWORD,
  );

  if (adminEmail === merchantEmail) {
    throw new Error("Seed users must have different emails");
  }

  const [adminHash, merchantHash] = await Promise.all([
    hash(adminPassword, 12),
    hash(merchantPassword, 12),
  ]);

  await prisma.$transaction(async (tx) => {
    // Admin
    const existingAdmin = await tx.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin && existingAdmin.role !== "ADMIN") {
      throw new Error("Admin seed email belongs to a non-admin account");
    }

    await tx.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        name: "Platform Admin",
        email: adminEmail,
        passwordHash: adminHash,
        role: "ADMIN",
      },
    });

    // Merchant user
    const user = await tx.user.upsert({
      where: { email: merchantEmail },
      update: {},
      create: {
        name: "Demo Merchant",
        email: merchantEmail,
        passwordHash: merchantHash,
        role: "MERCHANT",
      },
    });

    if (user.role !== "MERCHANT") {
      throw new Error("Merchant seed email belongs to a non-merchant account");
    }

    // Merchant workspace
    const merchant = await tx.merchant.upsert({
      where: { ownerId: user.id },
      update: {},
      create: {
        name: "Sunday Hospitality",
        ownerId: user.id,
      },
    });

    const cafeCategory = await tx.category.findUniqueOrThrow({ where: { name: "Cafe" } });

    // Demo business
    const existingBusiness = await tx.business.findFirst({
      where: {
        merchantId: merchant.id,
        name: "Sunday Coffee",
      },
    });

    if (!existingBusiness) {
      await tx.business.create({
        data: {
          name: "Sunday Coffee",
          merchantId: merchant.id,
          categoryId: cafeCategory.id,

          locations: {
            create: {
              name: "Downtown",
              address: "Replace with your branch address",
              googleReviewUrl: "https://www.google.com/maps",

              qrCodes: {
                create: {
                  name: "Front Counter",
                  source: "COUNTER",
                  slug: randomBytes(12).toString("base64url"),
                },
              },
            },
          },
        },
      });
    }
  });

  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });