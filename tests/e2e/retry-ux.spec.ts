import "dotenv/config";
import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { prisma } from "../../src/lib/prisma";

test("busy generation is neutral and retry preserves rating and tags", async ({
  page,
}) => {
  let userId: string | undefined;
  let categoryId: string | undefined;
  try {
    const slug = randomBytes(12).toString("base64url");
    const category = await prisma.category.create({
      data: {
        name: `Retry ${slug}`,
        slug: `retry-${slug}`,
        tags: { create: { name: "Test topic", slug: "topic" } },
      },
      include: { tags: true },
    });
    categoryId = category.id;
    const user = await prisma.user.create({
      data: {
        email: `retry-${slug}@example.test`,
        merchant: {
          create: {
            name: "Retry test",
            businesses: {
              create: {
                name: "Retry business",
                categoryId,
                locations: {
                  create: {
                    name: "Retry location",
                    googleReviewUrl: "https://g.page/r/test/review",
                    qrCodes: { create: { slug } },
                  },
                },
              },
            },
          },
        },
      },
    });
    userId = user.id;
    const qr = await prisma.qRCode.findUniqueOrThrow({ where: { slug } });
    let generations = 0;
    await page.route(`**/r/${slug}`, async (route) => {
      const request = route.request();
      if (request.method() === "POST" && request.headers()["next-action"]) {
        const payload = JSON.parse(request.postData()!)[0];
        if (
          payload.slug &&
          !("rating" in payload) &&
          !("selectedTags" in payload)
        ) {
          generations++;
          const result = {
            success: false,
            transient: generations === 1,
            error:
              generations === 1
                ? "AI is busy right now. Please try again."
                : "Permanent generation error",
          };
          await route.fulfill({
            contentType: "text/x-component",
            body: `0:{"a":"$@1","b":"development","f":""}\n1:${JSON.stringify(result)}\n`,
          });
          return;
        }
      }
      await route.continue();
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/r/${slug}`);
    await page
      .getByRole("button", { name: "Share Your Experience", exact: true })
      .click();
    await page.getByRole("button", { name: "Good", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Test topic", exact: true }).click();
    await page
      .getByRole("button", { name: "Generate Review Suggestions", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText(
      "AI is busy right now. Please try again.",
      { timeout: 20000 },
    );
    await expect(page.locator(".ant-alert-error")).toHaveCount(0);
    await expect(page.getByText("2 of 4", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Test topic", exact: true }),
    ).toBeVisible();
    const session = await prisma.reviewSession.findFirstOrThrow({
      where: { qrCodeId: qr.id },
    });
    expect(session.rating).toBe(4);
    expect(session.selectedTags).toEqual([category.tags[0].id]);
    await page
      .getByRole("button", { name: "Generate Review Suggestions", exact: true })
      .click();
    await expect(page.locator(".ant-alert-error")).toContainText(
      "Permanent generation error",
    );
    const after = await prisma.reviewSession.findFirstOrThrow({
      where: { qrCodeId: qr.id },
    });
    expect(after.id).toBe(session.id);
    expect(after.rating).toBe(4);
    expect(after.selectedTags).toEqual(session.selectedTags);
    expect(generations).toBe(2);
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  }
});
