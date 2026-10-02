import "dotenv/config";
import { test, expect } from "@playwright/test";
import { randomBytes, createHmac } from "node:crypto";
import { prisma } from "../../src/lib/prisma";

test("mobile steps preserve choices, save each rating mapping, and handle regeneration", async ({
  page,
  context,
}) => {
  const suffix = randomBytes(8).toString("hex");
  let userId: string | undefined;
  let categoryId: string | undefined;
  const reviews = [
    "My overall experience was positive.",
    "I was pleased with my experience overall.",
    "Overall, this was a good experience for me.",
  ];
  try {
    const category = await prisma.category.create({
      data: {
        name: `Review ${suffix}`,
        slug: `review-${suffix}`,
        tags: {
          create: ["Service", "Atmosphere", "Value", "Quality"].map(
            (name, i) => ({ name, slug: `topic-${i}` }),
          ),
        },
      },
      include: { tags: true },
    });
    categoryId = category.id;
    const slug = randomBytes(12).toString("base64url");
    const user = await prisma.user.create({
      data: {
        email: `generation-${suffix}@example.test`,
        merchant: {
          create: {
            name: "Test workspace",
            businesses: {
              create: {
                name: "Test business",
                categoryId,
                locations: {
                  create: {
                    name: "Test branch",
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
    const secret = process.env.AUTH_SECRET!;
    const key = randomBytes(24).toString("hex");
    const sign = (value: string) =>
      createHmac("sha256", secret).update(value).digest("hex");
    const session = await prisma.reviewSession.create({
      data: {
        qrCodeId: qr.id,
        visitorKey: sign(`visitor:${key}`),
        rating: 4,
        status: "REVIEW_GENERATED",
        selectedTags: [],
        generatedReviews: reviews,
      },
    });
    const origin = new URL(test.info().project.use.baseURL as string).origin;
    await context.addCookies([
      {
        name: "reviewdesk-visitor",
        value: `${key}.${sign(key)}`,
        url: origin,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/r/${slug}`);
    await page
      .getByRole("button", { name: "Share Your Experience", exact: true })
      .click();
    let regenerations = 0;
    let generationCalls = 0;
    await page.route(`**/r/${slug}`, async (route) => {
      const request = route.request();
      if (request.method() === "POST" && request.headers()["next-action"]) {
        const payload = JSON.parse(request.postData()!)[0];
        if (
          !("rating" in payload) &&
          !("selectedTags" in payload) &&
          !("reviewText" in payload)
        ) {
          generationCalls++;
          if (payload.regenerate) regenerations++;
          const fail = payload.regenerate && regenerations === 1;
          if (!fail)
            await prisma.reviewSession.update({
              where: { id: session.id },
              data: {
                generatedReviews: reviews,
                status: "REVIEW_GENERATED",
                ...(payload.regenerate ? { reviewText: null } : {}),
              },
            });
          await route.fulfill({
            contentType: "text/x-component",
            body: `0:{"a":"$@1","b":"development","f":""}\n1:${JSON.stringify(fail ? { success: false, transient: true, error: "AI busy" } : { success: true, reviews })}\n`,
          });
          return;
        }
      }
      await route.continue();
    });
    await expect(page.getByText("1 of 4", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Generate Review Suggestions",
        exact: true,
      }),
    ).toHaveCount(0);
    for (const [name, value] of [
      ["Excellent", 5],
      ["Okay", 3],
      ["Poor", 2],
      ["Very poor", 1],
      ["Good", 4],
    ] as const) {
      await page.getByRole("button", { name, exact: true }).click();
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.getByText("2 of 4", { exact: true })).toBeVisible();
      expect(
        (
          await prisma.reviewSession.findUniqueOrThrow({
            where: { id: session.id },
          })
        ).rating,
      ).toBe(value);
      expect(generationCalls).toBe(0);
      await page.getByRole("button", { name: "Back", exact: true }).click();
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
    }
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "How was your experience?" }),
    ).toHaveCount(0);
    for (const name of ["Service", "Atmosphere", "Value"])
      await page.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Quality", exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Generate Review Suggestions", exact: true })
      .click();
    await expect(page.getByText("3 of 4", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Service", exact: true }),
    ).toHaveCount(0);
    const suggestion = page.getByRole("button", {
      name: reviews[0],
      exact: true,
    });
    await suggestion.click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("4 of 4", { exact: true })).toBeVisible();
    const editor = page.getByRole("textbox", { name: "Your review" });
    await expect(editor).toHaveValue(reviews[0]);
    await expect(suggestion).toHaveCount(0);
    await editor.fill("My own edited review.");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(suggestion).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "Regenerate options", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("AI is busy");
    await expect(suggestion).toHaveAttribute("aria-pressed", "true");
    expect(
      (
        await prisma.reviewSession.findUniqueOrThrow({
          where: { id: session.id },
        })
      ).reviewText,
    ).toBe(reviews[0]);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(editor).toHaveValue("My own edited review.");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Service", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "Generate Review Suggestions", exact: true })
      .click();
    await expect(suggestion).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "Regenerate options", exact: true })
      .click();
    await expect(suggestion).toHaveAttribute("aria-pressed", "false");
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeDisabled();
    expect(
      await prisma.reviewSession.count({ where: { qrCodeId: qr.id } }),
    ).toBe(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: "/tmp/reviewdesk-step3.png" });
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
    await prisma.$disconnect();
  }
});
