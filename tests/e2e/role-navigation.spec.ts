import "dotenv/config";
import { test, expect } from "@playwright/test";
import { encode } from "@auth/core/jwt";
import { randomBytes } from "node:crypto";
import { prisma } from "../../src/lib/prisma";

test("role navigation, direct route guards, and admin merchant creation", async ({
  page,
  context,
}) => {
  test.setTimeout(240000);
  const suffix = randomBytes(8).toString("hex");
  const emails = ["admin", "merchant", "created"].map(
    (role) => `roles-${role}-${suffix}@example.test`,
  );
  const baseURL = test.info().project.use.baseURL as string;
  try {
    const admin = await prisma.user.create({
      data: { email: emails[0], role: "ADMIN" },
    });
    const merchant = await prisma.user.create({
      data: {
        email: emails[1],
        role: "MERCHANT",
        merchant: { create: { name: "Role test" } },
      },
    });
    async function signIn(id: string) {
      await context.clearCookies();
      const name = "authjs.session-token";
      await context.addCookies([
        {
          name,
          value: await encode({
            token: { sub: id },
            secret: process.env.AUTH_SECRET!,
            salt: name,
          }),
          url: baseURL,
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    }
    await signIn(admin.id);
    await page.goto("/dashboard");
    const menu = page.getByRole("menu").first();
    await expect(menu.getByRole("link")).toHaveText([
      "Dashboard",
      "Merchants",
      "All Businesses",
      "System Usage",
      "Settings",
    ]);
    await expect(
      page.getByRole("link", { name: "Generate QR", exact: true }),
    ).toHaveCount(0);
    for (const route of [
      "/businesses",
      "/locations",
      "/qr-codes",
      "/analytics",
      "/businesses/nonexistent",
      "/locations/nonexistent",
    ]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/unauthorized$/);
    }
    await page.goto("/admin/merchants");
    await page
      .getByRole("button", { name: "Create merchant", exact: true })
      .click();
    await page.getByLabel("Owner name", { exact: true }).fill("Test Owner");
    await page
      .getByLabel("Company name", { exact: true })
      .fill("Created Role Test");
    await page.getByLabel("Email", { exact: true }).fill(emails[2]);
    const password = randomBytes(20).toString("hex");
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password", { exact: true }).fill(password);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create merchant", exact: true })
      .click();
    await page
      .getByRole("link", { name: "Created Role Test", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Merchant businesses", exact: true }),
    ).toBeVisible({ timeout: 30000 });
    const created = await prisma.user.findUnique({
      where: { email: emails[2] },
      include: { merchant: true },
    });
    expect(created?.role).toBe("MERCHANT");
    expect(created?.merchant).toBeTruthy();

    await signIn(merchant.id);
    await page.goto("/dashboard");
    await expect(menu.getByRole("link")).toHaveText([
      "Dashboard",
      "Businesses",
      "Locations",
      "QR Codes",
      "Analytics",
      "Settings",
    ]);
    for (const route of [
      "/admin/merchants",
      "/admin/businesses",
      "/admin/usage",
      `/admin/merchants/${created!.merchant!.id}`,
    ]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/unauthorized$/);
    }
    await page.goto("/qr-codes");
    await expect(
      page.getByRole("link", { name: "Add location" }),
    ).toBeVisible({ timeout: 30000 });
  } finally {
    await context.clearCookies().catch(() => {});
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  }
});
