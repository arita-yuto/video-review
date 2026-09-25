import { test, expect } from "@playwright/test";

// The first-launch journey documented in documents/admin/README.md.
// Needs an unseeded database and a fresh server process; run-e2e.ts arranges both.
const ADMIN = { email: "admin@example.com", password: "bootstrap-pass" };

test.describe("bootstrap: first launch @bootstrap", () => {
    // Each test builds on the state the previous one left behind.
    test.describe.configure({ mode: "serial" });

    test("the root URL sends a new instance to the setup screen", async ({ page }) => {
        await page.goto("/");

        // page.tsx warms the database up first, hence the timeout.
        await expect(page).toHaveURL(/\/bootstrap\b/, { timeout: 60_000 });
        await expect(page.getByText("Please register an administrator")).toBeVisible();
    });

    test("registering the first administrator logs you in", async ({ page }) => {
        await page.goto("/bootstrap");

        await page.locator('input[type="email"]').fill(ADMIN.email);
        await page.locator('input[type="password"]').fill(ADMIN.password);
        await page.getByRole("button", { name: "Initialize" }).click();

        // bootstrap.tsx logs in and redirects via "/", so landing here proves the chain.
        await expect(page).toHaveURL(/\/video-review\/review\b/, { timeout: 60_000 });
    });

    test("the instance reports itself initialized afterwards", async ({ request }) => {
        const res = await request.get("/api/v1/admin/maintenance/status");

        expect(res.status()).toBe(200);
        expect(await res.json()).toMatchObject({
            hasAdmin: true,
            hasJwt: true,
            initialized: true,
        });
    });

    test("the setup screen is not offered again", async ({ page }) => {
        // Fresh context, no session: the root URL should lead to login now.
        await page.goto("/");

        await expect(page).toHaveURL(/\/login\b/, { timeout: 60_000 });
    });
});
