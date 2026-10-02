import "dotenv/config";
import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { prisma } from "../../src/lib/prisma";

for (const clipboardWorks of [true, false]) {
  test(`final review saves edited text before Google navigation (clipboard ${clipboardWorks})`, async ({
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
      const reviews = [
        "A positive overall experience.",
        "I enjoyed my experience overall.",
        "My overall impression was good.",
      ];
      let rejectSave = true;
      let clipboardCalls = 0;
      await page.exposeFunction("testClipboardWrite", (text: string) => {
        clipboardCalls++;
        expect(text).toBe("My edited review with my own words.");
        if (!clipboardWorks) throw new Error("Permission denied");
      });
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "clipboard", {
          value: {
            writeText: (text: string) =>
              (
                window as unknown as {
                  testClipboardWrite: (text: string) => Promise<void>;
                }
              ).testClipboardWrite(text),
          },
        });
      });
      await page.route("https://g.page/r/test/review", async (route) => {
        const saved = await prisma.reviewSession.findFirstOrThrow({
          where: { qrCodeId: qr.id },
        });
        expect(saved.reviewText).toBe("My edited review with my own words.");
        expect(saved.clickedGoogle).toBe(true);
        expect(saved.status).toBe("GOOGLE_CLICKED");
        await route.fulfill({
          contentType: "text/html",
          body: "<h1>Google destination intercepted</h1>",
        });
      });
      await page.route(`**/r/${slug}`, async (route) => {
        const request = route.request();
        if (request.method() === "POST" && request.headers()["next-action"]) {
          const payload = JSON.parse(request.postData()!)[0];
          let result: unknown;
          if (
            payload.slug &&
            !("rating" in payload) &&
            !("selectedTags" in payload) &&
            !("reviewText" in payload)
          ) {
            await prisma.reviewSession.updateMany({
              where: { qrCodeId: qr.id },
              data: { generatedReviews: reviews, status: "REVIEW_GENERATED" },
            });
            result = { success: true, reviews };
          } else if (
            payload.reviewText === "My edited review with my own words." &&
            rejectSave
          ) {
            rejectSave = false;
            result = {
              success: false,
              error: "Could not save your review. Please try again.",
            };
          }
          if (result) {
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
      await expect(
        page.getByText("Takes less than a minute", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("1 of 4", { exact: true })).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Good", exact: true }),
      ).toHaveCount(0);
      expect(await prisma.qRScan.count({ where: { qrCodeId: qr.id } })).toBe(1);
      expect(
        await prisma.reviewSession.count({ where: { qrCodeId: qr.id } }),
      ).toBe(0);
      if (clipboardWorks)
        await page.screenshot({ path: "/tmp/reviewdesk-welcome.png" });
      await page
        .getByRole("button", { name: "Share Your Experience", exact: true })
        .click();
      await expect(page.getByText("1 of 4", { exact: true })).toBeVisible();
      expect(
        await prisma.reviewSession.count({ where: { qrCodeId: qr.id } }),
      ).toBe(0);
      expect(await prisma.qRScan.count({ where: { qrCodeId: qr.id } })).toBe(1);
      await page.getByRole("button", { name: "Good", exact: true }).click();
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page
        .getByRole("button", { name: "Test topic", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Generate Review Suggestions",
          exact: true,
        })
        .click();
      await page.getByRole("button", { name: reviews[0], exact: true }).click();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      const textarea = page.getByRole("textbox", { name: "Your review" });
      await expect(textarea).toHaveValue(reviews[0]);
      const before = await prisma.reviewSession.findFirstOrThrow({
        where: { qrCodeId: qr.id },
      });
      expect(before.reviewText).toBe(reviews[0]);
      await textarea.fill(" ");
      await page
        .getByRole("button", { name: "Continue to Google", exact: true })
        .click();
      await expect(page.locator(".ant-alert-error")).toContainText(
        "Please enter your review.",
      );
      await textarea.fill("My edited review with my own words.");
      await page.getByRole("button", { name: /Copy to clipboard/ }).click();
      if (clipboardWorks)
        await expect(
          page.getByText("Review copied. Paste it on Google.", { exact: true }),
        ).toBeVisible();
      else
        await expect(page.locator(".ant-alert-error")).toContainText(
          "Could not copy",
        );

      await page
        .getByRole("button", { name: "Continue to Google", exact: true })
        .click();
      await expect(page.locator(".ant-alert-error")).toContainText(
        "Could not save",
      );
      await expect(textarea).toHaveValue("My edited review with my own words.");
      expect(page.url()).toContain(`/r/${slug}`);
      expect(clipboardCalls).toBe(1);
      const failed = await prisma.reviewSession.findUniqueOrThrow({
        where: { id: before.id },
      });
      expect(failed.clickedGoogle).toBe(false);
      expect(failed.reviewText).toBe(reviews[0]);
      await page
        .getByRole("button", { name: "Continue to Google", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Opening Google" }),
      ).toBeVisible();
      await expect(
        page.getByRole("textbox", { name: "Your review" }),
      ).toHaveCount(0);
      await expect(page).toHaveURL("https://g.page/r/test/review");
      expect(clipboardCalls).toBe(2);
      const after = await prisma.reviewSession.findUniqueOrThrow({
        where: { id: before.id },
      });
      expect(after.status).toBe("GOOGLE_CLICKED");
      expect(after.clickedGoogle).toBe(true);
      expect(after.reviewText).toBe("My edited review with my own words.");
      expect(
        await prisma.reviewSession.count({ where: { qrCodeId: qr.id } }),
      ).toBe(1);
    } finally {
      if (userId) await prisma.user.delete({ where: { id: userId } });
      if (categoryId)
        await prisma.category.delete({ where: { id: categoryId } });
      await prisma.$disconnect();
    }
  });
}
