import "dotenv/config";
import { randomBytes } from "node:crypto";
import { hash } from "bcrypt";
import { prisma } from "../src/lib/prisma";
import { emailSchema, passwordSchema } from "../src/lib/validations";

async function main() {
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

    // Cafe category
    const cafeCategory = await tx.category.upsert({
      where: { slug: "cafe" },
      update: {
        name: "Cafe",
        isActive: true,
      },
      create: {
        name: "Cafe",
        slug: "cafe",
        isActive: true,
        sortOrder: 1,
      },
    });

    // Cafe review tags
const cafeTags = [
  { name: "Food", slug: "food", icon: "food" },
  { name: "Drinks", slug: "drinks", icon: "coffee" },
  { name: "Service", slug: "service", icon: "user" },
  { name: "Ambience", slug: "ambience", icon: "ambience" },
  { name: "Cleanliness", slug: "cleanliness", icon: "sparkles" },
  { name: "Price", slug: "price", icon: "tag" },
  { name: "Location", slug: "location", icon: "location" },
  { name: "Variety", slug: "variety", icon: "grid" },
  { name: "Speed", slug: "speed", icon: "clock" },
  { name: "Friendly Staff", slug: "friendly-staff", icon: "team" },
  { name: "Seating", slug: "seating", icon: "chair" },
  { name: "Other", slug: "other", icon: "more" }
];

  for (const [index, tag] of cafeTags.entries()) {
  await tx.reviewTag.upsert({
    where: {
      categoryId_slug: {
        categoryId: cafeCategory.id,
        slug: tag.slug,
      },
    },
    update: {
      name: tag.name,
      icon: tag.icon,
      isActive: true,
      sortOrder: index + 1,
    },
    create: {
      name: tag.name,
      slug: tag.slug,
      icon: tag.icon,
      categoryId: cafeCategory.id,
      isActive: true,
      sortOrder: index + 1,
    },
  });
}

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