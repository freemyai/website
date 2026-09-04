import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test.describe("mobile", () => {
  test("menu opens and links are reachable", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("link", { name: "Developers" }).click();
    await expect(page).toHaveURL(/\/developers/);
  });

  test("no horizontal overflow", async ({ page }) => {
    for (const path of ["/", "/roadmap", "/developers", "/privacy", "/terms"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `overflow on ${path}`).toBe(0);
    }
  });

  test("waitlist usable", async ({ page }) => {
    await page.goto("/#waitlist");
    const input = page.getByLabel("Email address").first();
    await expect(input).toBeVisible();
    await input.fill("someone@example.com");
    await expect(input).toHaveValue("someone@example.com");
  });
});
