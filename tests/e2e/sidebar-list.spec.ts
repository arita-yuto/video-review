import { test, expect } from "@playwright/test";

// Seeded admin user (see prisma/seed/user.ts).
const USER = { email: "Bocchi@example.com", password: "pass123" };

const TREE = '[data-slot="browse-tree"]';

async function login(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(USER.email);
    await page.locator('input[type="password"]').fill(USER.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
}

test.describe("sidebar video list", () => {
    test("hovering a row shows the video's detail card", async ({ page }) => {
        await login(page);
        // The top-level folder holds only folders; the videos are one level down.
        await page.locator(`${TREE} [aria-expanded="false"]`).first().click();
        await page.locator(`${TREE} [aria-expanded="false"]`).first().click();

        const row = page.locator(`${TREE} [data-sidebar="menu-button"][data-size="auto"]`).first();
        const title = (await row.locator('[data-slot="middle-truncate"]').textContent())!;
        await row.hover();

        await expect(page.locator('[data-slot="thumbnail-detail"]')).toContainText(title);
    });
});
