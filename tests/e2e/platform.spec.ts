import "dotenv/config";
import { test, expect } from "@playwright/test";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "../../src/lib/prisma";

test.beforeAll(async () => {
  // Dedicated test database only: reset this suite's shared local abuse buckets.
  const identities = [
    "register:local",
    "login-ip:local",
    "review-ip:local",
    `login-account:${process.env.SEED_ADMIN_EMAIL?.toLowerCase()}`,
  ];
  await prisma.rateLimit.deleteMany({
    where: {
      key: {
        in: identities.map((value) =>
          createHash("sha256").update(value).digest("hex"),
        ),
      },
    },
  });
});
test.afterAll(async () => {
  await prisma.$disconnect();
});
test("merchant CRUD, QR preview/download, review persistence, admin guards and mobile", async ({
  page,
  context,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|didn.t match|server rendered/i.test(message.text())
    )
      errors.push(message.text());
  });
  const suffix = randomBytes(4).toString("hex");
  const email = `e2e-${suffix}@example.test`;
  const password = randomBytes(18).toString("base64url");
  let userId: string | undefined;
  try {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/register");
    await page.getByLabel("Name", { exact: true }).fill("Test Merchant");
    await page.getByLabel("Merchant / Company Name").fill("Test Workspace");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm Password").fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page).toHaveURL(/\/login/);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      include: { merchant: true },
    });
    userId = user.id;
    expect(user.role).toBe("MERCHANT");
    expect(user.passwordHash).not.toBe(password);
    expect(user.merchant).not.toBeNull();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: "Your workspace at a glance" }),
    ).toBeVisible();
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto("/admin/merchants");
    await expect(
      page.getByText("Access restricted", { exact: true }),
    ).toBeVisible();
    const foreign = await prisma.business.findFirstOrThrow({
      where: { merchantId: { not: user.merchant!.id } },
    });
    await page.goto(`/businesses/${foreign.id}`);
    await expect(
      page.getByText("Page not found", { exact: true }),
    ).toBeVisible();
    await page.goto("/businesses");
    await page
      .getByRole("button", { name: "Add business", exact: true })
      .click();
    await page
      .getByLabel("Business Name", { exact: true })
      .fill(`Test Cafe ${suffix}`);
    await page.getByLabel("Category", { exact: true }).click();
    await page.getByTitle("Cafe", { exact: true }).click();
    await page.getByRole("button", { name: /Save business/ }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByText(`Test Cafe ${suffix}`, { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .getByLabel("Business Name", { exact: true })
      .fill(`Edited Cafe ${suffix}`);
    await page.getByRole("button", { name: /Save business/ }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.goto("/locations");
    await page
      .getByRole("button", { name: "Add location", exact: true })
      .click();
    await page.getByLabel("Location Name", { exact: true }).fill("Test Branch");
    await page.getByLabel("Address", { exact: true }).fill("Test Address");
    await page
      .getByLabel("Google Review URL", { exact: true })
      .fill("https://g.page/r/test/review");
    await page.getByRole("button", { name: /Save location/ }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByRole("link", { name: "Test Branch", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Address", { exact: true }).fill("Updated Address");
    await page.getByRole("button", { name: /Save location/ }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Updated Address", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Generate QR", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("QR Name", { exact: true }).fill("Test Counter");
    await page
      .getByRole("button", { name: "Generate QR", exact: true })
      .last()
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText("Test Counter", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByAltText("Review QR for Test Branch")).toBeVisible();
    const publicUrl = await page.getByLabel("Public review URL").inputValue();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: /Copy URL/ }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      publicUrl,
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    const qr = await prisma.qRCode.findFirstOrThrow({
      where: { slug: publicUrl.split("/").pop()! },
    });
    expect(
      await prisma.reviewSession.count({ where: { qrCodeId: qr.id } }),
    ).toBe(0);
    const customerContext = await browser.newContext();
    const customer = await customerContext.newPage();
    await customer.goto(publicUrl);
    await expect(
      customer.getByRole("heading", { name: "How was your experience?" }),
    ).toBeVisible();
    expect(await prisma.qRScan.count({ where: { qrCodeId: qr.id } })).toBe(1);
    await customer.reload();
    expect(await prisma.qRScan.count({ where: { qrCodeId: qr.id } })).toBe(2);
    expect(
      await prisma.reviewSession.count({ where: { qrCodeId: qr.id } }),
    ).toBe(0);
    await customer
      .getByRole("button", { name: "Share Your Experience", exact: true })
      .click();
    await customer.getByRole("button", { name: "Good", exact: true }).click();
    await customer.getByRole("button", { name: "Next", exact: true }).click();
    await expect(
      customer.getByText("2 of 4", {
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await prisma.reviewSession.count({ where: { qrCodeId: qr.id } }),
    ).toBe(1);
    await customer.reload();
    await customer
      .getByRole("button", { name: "Share Your Experience", exact: true })
      .click();
    await customer
      .getByRole("button", { name: "Excellent", exact: true })
      .click();
    await customer.getByRole("button", { name: "Next", exact: true }).click();
    await expect(
      customer.getByText("2 of 4", {
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await prisma.reviewSession.count({ where: { qrCodeId: qr.id } }),
    ).toBe(1);
    const session = await prisma.reviewSession.findFirstOrThrow({
      where: { qrCodeId: qr.id },
    });
    expect(session.rating).toBe(5);
    expect(session.status).toBe("RATED");
    expect(session.clickedGoogle).toBe(false);
    expect(session.selectedTags).toEqual([]);
    expect(session.reviewText).toBeNull();
    await expect(customer).toHaveURL(publicUrl);
    await expect(customer.getByRole("button", { name: /Google/ })).toHaveCount(
      0,
    );
    const scansBeforeInactive = await prisma.qRScan.count({
      where: { qrCodeId: qr.id },
    });
    await page.getByRole("switch").click();
    await expect(page.getByRole("switch")).not.toBeChecked();
    await customer.goto(publicUrl);
    await expect(
      customer.getByText("This review link is unavailable", { exact: true }),
    ).toBeVisible();
    await page.getByRole("switch").click();
    await expect(page.getByRole("switch")).toBeChecked();
    await customer.goto(new URL("/r/not-a-real-slug", publicUrl).toString());
    await expect(
      customer.getByText("Review link not found", { exact: true }),
    ).toBeVisible();
    await customer.goto(
      new URL(
        `/r/${randomBytes(12).toString("base64url")}`,
        publicUrl,
      ).toString(),
    );
    await expect(
      customer.getByText("Review link not found", { exact: true }),
    ).toBeVisible();
    expect(await prisma.qRScan.count({ where: { qrCodeId: qr.id } })).toBe(
      scansBeforeInactive,
    );
    await customerContext.close();
    await page.goto("/analytics");
    await expect(
      page
        .locator(".ant-card")
        .filter({ has: page.getByText("QR Scans", { exact: true }) })
        .locator(".stat-value"),
    ).toHaveText(String(scansBeforeInactive));
    await expect(page.getByText("0.0%", { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Businesses", exact: true })
      .click();
    await expect(page).toHaveURL(/\/businesses/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/locations");
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("button", { name: "Delete", exact: true })
      .last()
      .click();
    await expect(
      page.getByRole("link", { name: "Test Branch", exact: true }),
    ).not.toBeVisible();
    await page.goto("/businesses");
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("button", { name: "Delete", exact: true })
      .last()
      .click();
    await expect(
      page.getByText(`Edited Cafe ${suffix}`, { exact: true }),
    ).not.toBeVisible();
    await page.getByRole("button", { name: /Test Merchant/ }).click();
    await page.getByText("Log out", { exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    expect(errors).toEqual([]);
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } });
  }
});
test("administrator can open all admin pages", async ({ page }) => {
  test.skip(
    !process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD,
    "Set seeded admin credentials",
  );
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env.SEED_ADMIN_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  for (const [path, title] of [
    ["/admin/merchants", "Merchants"],
    ["/admin/businesses", "All Businesses"],
    ["/admin/usage", "Analytics"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }
});
