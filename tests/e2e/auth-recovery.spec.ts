import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { encode } from "@auth/core/jwt";
import { hash } from "bcrypt";
import { randomBytes } from "node:crypto";
import { prisma } from "../../src/lib/prisma";

async function stable(page: Page) {
  // Observe a quiet interval after navigation settles; no timer should refresh it.
  await page.waitForLoadState("networkidle");
  const navigations: string[] = [];
  const listener = (request: import("@playwright/test").Request) => {
    if (request.isNavigationRequest()) navigations.push(request.url());
  };
  page.on("request", listener);
  await page.waitForTimeout(2000);
  page.off("request", listener);
  expect(navigations).toEqual([]);
}

test("auth recovery: anonymous, deleted JWT, admin with no workspace, missing merchant, registration", async ({
  page,
  context,
}) => {
  const ids: string[] = [];
  const suffix = randomBytes(8).toString("hex");
  const password = randomBytes(20).toString("base64url");
  const registeredEmail = `recovery-new-${suffix}@example.test`;
  const baseURL = test.info().project.use.baseURL as string;
  try {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await stable(page);

    // Valid signature, nonexistent subject: never bounce from login to dashboard.
    const cookieName = "authjs.session-token";
    const token = await encode({
      token: { sub: "deleted-" + suffix },
      secret: process.env.AUTH_SECRET!,
      salt: cookieName,
    });
    await context.addCookies([
      {
        name: cookieName,
        value: token,
        url: baseURL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
    await stable(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/, { timeout: 30000 });
    await stable(page);
    const response = await context.request.get("/api/auth/session");
    expect(await response.json()).toBeNull();

    await context.clearCookies();
    const admin = await prisma.user.create({
      data: {
        email: `recovery-admin-${suffix}@example.test`,
        role: "ADMIN",
        passwordHash: await hash(password, 10),
      },
    });
    ids.push(admin.id);
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(admin.email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: "Platform overview" }),
    ).toBeVisible();
    await expect(
      page.getByText("Your merchant workspace is unavailable", { exact: true }),
    ).toHaveCount(0);
    await stable(page);
    // Confirm the cleaned database has no merchants before creating the registration fixture.
    expect(await prisma.merchant.count()).toBe(0);

    await context.clearCookies();
    const orphan = await prisma.user.create({
      data: {
        email: `recovery-orphan-${suffix}@example.test`,
        role: "MERCHANT",
        passwordHash: await hash(password, 10),
      },
    });
    ids.push(orphan.id);
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(orphan.email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: "Your merchant workspace is unavailable",
      }),
    ).toBeVisible({ timeout: 30000 });
    await stable(page);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", {
        name: "Your merchant workspace is unavailable",
      }),
    ).toBeVisible();

    await context.clearCookies();
    await page.goto("/register");
    await page.getByLabel("Name", { exact: true }).fill("Recovery Test");
    await page.getByLabel("Merchant / Company Name").fill("Recovery Workspace");
    await page.getByLabel("Email", { exact: true }).fill(registeredEmail);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm Password").fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 30000 });
    const registered = await prisma.user.findUniqueOrThrow({
      where: { email: registeredEmail },
      include: { merchant: true },
    });
    ids.push(registered.id);
    expect(registered.merchant).not.toBeNull();
    await page.getByLabel("Email", { exact: true }).fill(registeredEmail);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: "Your workspace at a glance" }),
    ).toBeVisible();
    await stable(page);
  } finally {
    await context.clearCookies();
    await prisma.user.deleteMany({
      where: { OR: [{ id: { in: ids } }, { email: registeredEmail }] },
    });
    await prisma.$disconnect();
  }
});
