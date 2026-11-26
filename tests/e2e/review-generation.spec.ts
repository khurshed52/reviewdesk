import "dotenv/config";
import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { prisma } from "../../src/lib/prisma";

test.use({ hasTouch: true });

test("three-screen QR/NFC flow: optional tags, cache, edits, honest ratings, handoff and completion", async ({
  page,
  context,
  browserName,
}) => {
  test.setTimeout(360000);
  const suffix = randomBytes(8).toString("hex");
  let userId: string | undefined;
  let categoryId: string | undefined;
  const googleURL = "https://g.page/r/reviewdesk-test/review";
  try {
    const category = await prisma.category.create({
      data: {
        name: "Flow " + suffix,
        slug: suffix,
        tags: {
          create: ["Food", "Service", "Cleanliness", "Price", "Drinks", "Ambience", "Location", "Variety", "Speed", "Friendly Staff", "Seating", "Other"].map(
            (name, index) => ({
              name,
              slug: "tag-" + index,
              icon: ["food", "user", "sparkles", "tag"][index % 4],
            }),
          ),
        },
      },
      include: { tags: true },
    });
    categoryId = category.id;
    const slug = randomBytes(12).toString("base64url");
    const user = await prisma.user.create({
      data: {
        email: "flow-" + suffix + "@example.test",
        merchant: {
          create: {
            name: "Flow test",
            businesses: {
              create: {
                name: "Cafe",
                categoryId,
                locations: {
                  create: {
                    name: "Balepur",
                    googleReviewUrl: googleURL,
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
    let generated = 0;
    let failGeneration = false;
    let failSave = false;
    let clipboardWorks = true;
    let lastCopied = "";
    await page.exposeFunction("testCopy", (value: string) => {
      if (!clipboardWorks) throw new Error("Clipboard denied");
      lastCopied = value;
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: (text: string) =>
            (
              window as unknown as { testCopy: (text: string) => Promise<void> }
            ).testCopy(text),
        },
      });
    });
    await context.route(googleURL, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<h1>Google test destination</h1>",
      }),
    );
    await page.route("**/r/" + slug + "**", async (route) => {
      const request = route.request();
      if (request.method() === "POST" && request.headers()["next-action"]) {
        const payload = JSON.parse(request.postData()!)[0];
        let result;
        if ("regenerate" in payload) {
          generated++;
          if (failGeneration) {
            failGeneration = false;
            result = {
              success: false,
              transient: true,
              error: "AI is busy right now. Please try again.",
            };
          } else {
            // Only the AI provider is stubbed: rating, tags, handoff and confirmation use real actions.
            const session = await prisma.reviewSession.findFirstOrThrow({
              where: { qrCodeId: qr.id },
              orderBy: { createdAt: "desc" },
            });
            const sentiment =
              session.rating! >= 4
                ? "positive"
                : session.rating === 3
                  ? "mixed"
                  : "disappointing";
            const reviews = [
              "My overall experience was " + sentiment + ".",
              "I found the experience " + sentiment + " overall.",
              "Overall, this was a " + sentiment + " visit.",
            ];
            await prisma.reviewSession.update({
              where: { id: session.id },
              data: {
                generatedReviews: reviews,
                status: "REVIEW_GENERATED",
                reviewText: null,
              },
            });
            result = { success: true, reviews };
          }
        } else if (
          payload.reviewText === "My own edited experience." &&
          failSave
        ) {
          failSave = false;
          result = {
            success: false,
            error: "Could not save your review. Please try again.",
          };
        }
        if (result) {
          await route.fulfill({
            contentType: "text/x-component",
            body:
              '0:{"a":"$@1","b":"development","f":""}\n1:' +
              JSON.stringify(result) +
              "\n",
          });
          return;
        }
      }
      await route.continue();
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const choices = ["Excellent", "Good", "Okay", "Poor", "Very poor"];
    for (let index = 0; index < choices.length; index++) {
      // Keep the same signed browser cookie across repeated submissions.
      clipboardWorks = index !== 4;
      const entry = index === 2 ? "nfc" : "qr";
      await page.goto("/r/" + slug + "?entry=" + entry);
      await expect(
        page.getByRole("heading", { name: "How was your experience?" }),
      ).toBeVisible({ timeout: 30000 });
      await expect(
        page.getByRole("button", { name: "Create My Review" }),
      ).toBeDisabled();
      await expect(
        page.getByRole("button", { name: "Share Your Experience" }),
      ).toHaveCount(0);
      if (index === 0) {
        for (const viewport of [{width: 360, height: 640}, {width: 390, height: 844}, {width: 430, height: 932}]) {
          await page.setViewportSize(viewport);
          const box = await page.getByRole("button", { name: "Create My Review" }).boundingBox();
          expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
        await page.setViewportSize({width: 390, height: 844});
      }
      await page
        .getByRole("button", { name: choices[index], exact: true })
        .click();
      const tagCount = index === 1 ? 3 : index === 2 ? 2 : index === 3 ? 1 : 0;
      for (const tag of category.tags.slice(0, tagCount))
        await page.getByRole("button", { name: tag.name, exact: true }).click();
      if (tagCount === 3)
        await expect(
          page.getByRole("button", {
            name: category.tags[3].name,
            exact: true,
          }),
        ).toBeDisabled();
      if (index === 0) {
        await expect(
          page.getByRole("button", { name: "Create My Review" }),
        ).toBeEnabled();
        await page.screenshot({
          path: "/tmp/reviewdesk-screen-1.png",
          animations: "disabled",
        });
        failGeneration = true;
      }
      await page.getByRole("button", { name: "Create My Review" }).click();
      if (index === 0) {
        await expect(page.getByRole("status")).toContainText("AI is busy", { timeout: 30000 });
        await expect(
          page.getByRole("button", { name: "Excellent", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await page.getByRole("button", { name: "Create My Review" }).click();
      }
      await expect(
        page.getByRole("heading", { name: "Here’s a review for you" }),
      ).toBeVisible({ timeout: 30000 });
      if (index === 0) {
        await expect(page.getByRole("button", { name: "Show suggestion 2" })).toHaveAttribute("aria-current", "true", { timeout: 12000 });
        await page.getByRole("button", { name: "Show suggestion 1" }).click();
        await expect(page.getByRole("button", { name: "Auto-play", exact: true })).toBeVisible({ timeout: 30000 });
        const box = await page.getByRole("button", { name: "Use This Review" }).boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(844);
      }
      const session = await prisma.reviewSession.findFirstOrThrow({
        where: { qrCodeId: qr.id },
        orderBy: { createdAt: "desc" },
      });
      expect(session.rating).toBe(5 - index);
      expect(session.selectedTags).toHaveLength(tagCount);
      expect(session.status).toBe("REVIEW_GENERATED");
      await expect
        .poll(() => prisma.qRScan.count({ where: { qrCodeId: qr.id } }))
        .toBeGreaterThan(0);
      expect(
        await prisma.reviewSession.count({ where: { qrCodeId: qr.id } }),
      ).toBe(index + 1);
      if (index === 1) {
        await page.getByRole("button", { name: "Back to experience" }).click();
        await expect(
          page.getByRole("button", { name: "Good", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        for (const tag of category.tags.slice(0, 3))
          await expect(
            page.getByRole("button", { name: tag.name, exact: true }),
          ).toHaveAttribute("aria-pressed", "true");
        await page.getByRole("button", { name: "Create My Review" }).click();
        await expect(
          page.getByRole("heading", { name: "Here’s a review for you" }),
        ).toBeVisible({ timeout: 30000 });
      }
      if (index === 0) {
        const requestsBeforeSliding = generated;
        await page
          .getByRole("button", { name: "Show suggestion 3", exact: true })
          .click();
        await expect(
          page.getByText(session.generatedReviews[2], { exact: true }),
        ).toBeVisible({ timeout: 30000 });
        const card = page.getByRole("region", { name: "Review suggestions" });
        const bounds = (await card.boundingBox())!;
        const touch = browserName === "chromium" ? await context.newCDPSession(page) : null;
        const y = bounds.y + bounds.height / 2;
        async function swipe(from: number, to: number) {
          if (!touch) {
            await card.evaluate((target, { from, to, y }) => {
              // Desktop WebKit has no public Touch constructor. Exercise the
              // native listeners with equivalent touch lists; taps below use
              // Playwright's real touchscreen input.
              const finger = (x: number) => ({ identifier: 1, target, clientX: x, clientY: y });
              const dispatch = (type: string, x: number) => {
                const event = new Event(type, { bubbles: true, cancelable: true });
                Object.defineProperties(event, {
                  touches: { value: type === "touchend" ? [] : [finger(x)] },
                  changedTouches: { value: [finger(x)] },
                });
                target.dispatchEvent(event);
              };
              dispatch("touchstart", from);
              dispatch("touchmove", to);
              dispatch("touchend", to);
            }, { from, to, y });
            return;
          }
          await touch.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x: from, y }],
          });
          await touch.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: to, y }],
          });
          await touch.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
        }
        await swipe(bounds.x + 60, bounds.x + 220);
        await expect(
          page.getByText(session.generatedReviews[1], { exact: true }),
        ).toBeVisible({ timeout: 30000 });
        await swipe(bounds.x + 220, bounds.x + 60);
        await expect(
          page.getByText(session.generatedReviews[2], { exact: true }),
        ).toBeVisible({ timeout: 30000 });
        await expect(
          page.getByRole("button", { name: "Show suggestion 3", exact: true }),
        ).toHaveAttribute("aria-current", "true");
        await touch?.detach();
        await page.getByRole("button", {name: "Next review", exact: true}).tap();
        await expect(page.getByRole("button", {name: "Show suggestion 1", exact: true})).toHaveAttribute("aria-current", "true");
        await page.getByRole("button", {name: "Previous review", exact: true}).tap();
        await page
          .getByRole("button", { name: "Show suggestion 1", exact: true })
          .click();
        expect(generated).toBe(requestsBeforeSliding);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
      const before = generated;
      if (index === 1) {
        await page.getByRole("button", { name: "Try Another" }).click();
        expect(generated).toBe(before);
        await page.getByRole("button", { name: "Try Another" }).click();
        expect(generated).toBe(before);
        failGeneration = true;
        await page.getByRole("button", { name: "Try Another" }).click();
        await expect(page.getByRole("status")).toContainText("AI is busy", { timeout: 30000 });
        await expect(
          page.getByText(session.generatedReviews[2], { exact: true }),
        ).toBeVisible({ timeout: 30000 });
        await page.getByRole("button", { name: "Try Another" }).click();
        await expect(
          page.getByText(session.generatedReviews[0], { exact: true }),
        ).toBeVisible({ timeout: 30000 });
        await page.getByRole("button", { name: "Edit", exact: true }).click();
        await page
          .getByRole("textbox", { name: "Your review" })
          .fill("My own edited experience.");
        await page.getByRole("button", { name: "Done", exact: true }).click();
        await page
          .getByRole("button", { name: "Show suggestion 2", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Show suggestion 1", exact: true })
          .click();
        await expect(
          page.getByText("My own edited experience.", { exact: true }),
        ).toBeVisible({ timeout: 30000 });
        failSave = true;
      }
      if (index === 0)
        await page.screenshot({ path: "/tmp/reviewdesk-screen-2.png" });
      await page.getByRole("button", { name: "Use This Review" }).click();
      if (index === 1) {
        await expect(
          page.getByRole("alert").filter({ hasText: "Could not save" }),
        ).toContainText("Could not save");
        await expect(
          page.getByText("My own edited experience.", { exact: true }),
        ).toBeVisible({ timeout: 30000 });
        await page.getByRole("button", { name: "Use This Review" }).click();
      }
      await expect(
        page.getByRole("heading", {
          name: clipboardWorks ? "Review Copied!" : "Your review is ready",
          exact: true,
        }),
      ).toBeVisible({ timeout: 30000 });
      const handoff = await prisma.reviewSession.findUniqueOrThrow({
        where: { id: session.id },
      });
      expect(handoff.clickedGoogle).toBe(true);
      expect(handoff.status).toBe("GOOGLE_CLICKED");
      if (clipboardWorks) expect(lastCopied).toBe(handoff.reviewText);
      if (index === 1)
        expect(handoff.reviewText).toBe("My own edited experience.");
      if (index === 0)
        await page.screenshot({ path: "/tmp/reviewdesk-screen-3.png" });
      // A focus/visible event without leaving must never trigger confirmation.
      await page.evaluate(() =>
        document.dispatchEvent(new Event("visibilitychange")),
      );
      await expect(page.getByRole("button", { name: "Yes, done" })).toHaveCount(
        0,
      );
      const popupPromise = page.waitForEvent("popup");
      await page
        .getByRole("button", { name: "Open Google Review", exact: true })
        .click();
      const popup = await popupPromise;
      await expect(popup).toHaveURL(googleURL);
      await popup.close();
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          value: "hidden",
        });
        document.dispatchEvent(new Event("visibilitychange"));
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          value: "visible",
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await expect(
        page.getByRole("heading", {
          name: "Did you finish posting your review?",
        }),
      ).toBeVisible({ timeout: 30000 });
      await page.getByRole("button", { name: "Yes, done" }).click();
      await expect(
        page.getByRole("heading", { name: "Thank you!", exact: true }),
      ).toBeVisible({ timeout: 30000 });
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "How was your experience?", exact: true }),
      ).toBeVisible({ timeout: 30000 });
      await expect(
        page.getByRole("button", { name: "Create My Review" }),
      ).toBeDisabled();
      const completed = await prisma.reviewSession.findUniqueOrThrow({
        where: { id: session.id },
      });
      expect(completed.confirmedPostedAt).not.toBeNull();
      expect(
        await prisma.reviewSession.count({ where: { qrCodeId: qr.id } }),
      ).toBe(index + 1);
    }
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  }
});
