import { test, expect } from "@playwright/test";

// Seeded admin user (see prisma/seed.ts).
const USER = { email: "Bocchi@example.com", password: "pass123" };

test.describe("smoke: reach the app and log in", () => {
    test("login page loads at the base URL", async ({ page }) => {
        const res = await page.goto("/");
        // Any served response (the root redirects into the login flow) is fine;
        // what matters is the server answered without a 5xx.
        expect(res, "root URL returned a response").not.toBeNull();
        expect(res!.status(), "root URL is not a server error").toBeLessThan(500);

        // The login UI lives at /login. Confirm the panel renders.
        await page.goto("/login");
        await expect(page.getByRole("tab", { name: "Email & Password" })).toBeVisible();
    });

    test("email/password login lands on the review main page", async ({ page }) => {
        await page.goto("/login");

        // The default tab is configurable, so pick "Email & Password" explicitly.
        await page.getByRole("tab", { name: "Email & Password" }).click();

        // Only the active tab panel is mounted, so these selectors are unambiguous.
        await page.locator('input[type="email"]').fill(USER.email);
        await page.locator('input[type="password"]').fill(USER.password);

        // The password field submits on Enter (see components/login.tsx).
        await page.locator('input[type="password"]').press("Enter");

        // Successful login pushes to the review page. The review page then runs
        // an async auth check and would bounce back to /video-review/login if the
        // token were invalid — so staying on /review proves login end-to-end.
        await expect(page).toHaveURL(/\/video-review\/review\b/, { timeout: 15_000 });

        // Give the client-side auth guard time to run, then confirm we did NOT
        // get redirected back to the login screen.
        await page.waitForTimeout(1500);
        await expect(page).toHaveURL(/\/video-review\/review\b/);
    });

    test("wrong password does not log in", async ({ page }) => {
        await page.goto("/login");
        await page.getByRole("tab", { name: "Email & Password" }).click();
        await page.locator('input[type="email"]').fill(USER.email);
        await page.locator('input[type="password"]').fill("wrong-password");

        // handleLogin shows an alert on failure; accept it and assert we stay put.
        page.on("dialog", (d) => d.accept());
        await page.locator('input[type="password"]').press("Enter");

        await page.waitForTimeout(1000);
        await expect(page).not.toHaveURL(/\/video-review\/review\b/);
    });
});
