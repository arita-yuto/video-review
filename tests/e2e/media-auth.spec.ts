import { test, expect } from "@playwright/test";

// Seeded admin user (see prisma/seed/user.ts).
const USER = { email: "Bocchi@example.com", password: "pass123" };

// A seeded revision path under local storage. The seed ships no media bytes, so a
// request that reaches the handler returns 404 while an unauthenticated one is 401.
const MEDIA_URL = "/api/v1/media/local/videos/demo/rev_001.mp4";

async function login(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(USER.email);
    await page.locator('input[type="password"]').fill(USER.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
}

test.describe("media endpoint auth", () => {
    test("a logged-in browser authenticates via the cookie", async ({ page }) => {
        await login(page);
        // page.request shares the browser context cookies, including the httpOnly auth cookie.
        const res = await page.request.get(MEDIA_URL);
        expect(res.status(), "cookie must pass the media guard").toBe(404);
    });

    test("an unauthenticated request is rejected with 401", async ({ request }) => {
        const res = await request.get(MEDIA_URL);
        expect(res.status()).toBe(401);
    });
});
