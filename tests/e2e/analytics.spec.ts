import "dotenv/config";
import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { hash } from "bcrypt";
import { prisma } from "../../src/lib/prisma";

test("merchant funnel, rankings and activity render on mobile and desktop", async ({
  page,
}) => {
  let userId: string | undefined;
  let categoryId: string | undefined;
  const suffix = randomBytes(8).toString("hex");
  const password = randomBytes(18).toString("base64url");
  try {
    const category = await prisma.category.create({
      data: { name: `Analytics UI ${suffix}`, slug: suffix },
    });
    categoryId = category.id;
    const user = await prisma.user.create({
      data: {
        email: `analytics-ui-${suffix}@example.test`,
        passwordHash: await hash(password, 10),
        merchant: {
          create: {
            name: "Analytics UI",
            businesses: {
              create: {
                name: "Analytics business",
                categoryId,
                locations: {
                  create: {
                    name: "Analytics branch",
                    googleReviewUrl: "https://g.page/r/test/review",
                    qrCodes: {
                      create: {
                        name: "Analytics QR",
                        slug: suffix,
                        scans: { create: [{}, {}, {}, {}] },
                        sessions: {
                          create: {
                            visitorKey: suffix,
                            rating: 4,
                            status: "GOOGLE_CLICKED",
                            reviewText: "Final review",
                            clickedGoogle: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    userId = user.id;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(
        page.getByText("Customer conversion funnel", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Overall Scan → Google: 25.0%", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Scan → Rating: 25.0%", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Rating → Generated: 100.0%", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Top QR codes by scans", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Top locations by scans", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("GOOGLE CLICKED", { exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto("/analytics");
    await expect(
      page.getByText("Overall Scan → Google: 25.0%", { exact: true }),
    ).toBeVisible();
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  }
});
