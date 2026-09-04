import { expect, test } from "@playwright/test";

test.describe("homepage", () => {
  test("loads with correct title and single h1", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Freemy AI — The AI You Own/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole("heading", { level: 1, name: "The AI you own." }),
    ).toBeVisible();
  });

  test("hero CTAs are correct", async ({ page }) => {
    await page.goto("/");
    const join = page.getByRole("link", { name: "Join the Alpha" }).first();
    await expect(join).toBeVisible();
    await expect(join).toHaveAttribute("href", "/#waitlist");

    const github = page.getByRole("link", { name: /Follow on GitHub/ });
    await expect(github).toHaveAttribute("href", "https://github.com/freemyai");
  });

  test("navigation works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Roadmap" }).first().click();
    await expect(page).toHaveURL(/\/roadmap/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "From lab experiments",
    );
  });

  test("developers page works", async ({ page }) => {
    await page.goto("/developers");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Build with an AI the user can own.",
    );
    await expect(page.getByText("Model Interface")).toBeVisible();
    await expect(page.getByText("Memory Interface")).toBeVisible();
    await expect(page.getByText("Agent Interface")).toBeVisible();
  });

  test("privacy and terms pages load", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Privacy",
    );
    await page.goto("/terms");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Terms",
    );
  });

  test("404 page", async ({ page }) => {
    await page.goto("/no-such-page");
    await expect(
      page.getByText("This path doesn't belong to Freemy yet."),
    ).toBeVisible();
    await page.getByRole("link", { name: "Back home" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("waitlist validates email", async ({ page }) => {
    await page.goto("/#waitlist");
    const input = page.getByLabel("Email address").first();
    await input.fill("not-an-email");
    await page.getByRole("button", { name: "Join the Alpha" }).first().click();
    // Browser-native validation blocks submission of invalid emails.
    const validationMessage = await input.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    );
    expect(validationMessage).not.toBe("");
  });

  test("seo endpoints respond", async ({ request }) => {
    for (const path of ["/sitemap.xml", "/robots.txt", "/llms.txt"]) {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
    }
  });
});

test.describe("accessibility smoke", () => {
  test("form labels and button names", async ({ page }) => {
    await page.goto("/#waitlist");
    await expect(page.getByLabel("Email address").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Join the Alpha" }).first(),
    ).toBeVisible();
  });

  test("heading hierarchy has one h1", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });

  test("skip link is focusable", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByText("Skip to content")).toBeFocused();
  });
});
