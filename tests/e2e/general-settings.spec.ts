import { test, expect } from "@playwright/test";

// Seeded admin user (see prisma/seed.ts).
const ADMIN = { email: "Bocchi@example.com", password: "pass123" };

async function loginAsAdmin(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
}

// The default tab is what every other spec ignores (they all pick a tab explicitly), so changing
// it proves the path from Save to the login screen without getting in the way of parallel specs.
test.describe("General settings", () => {
    test("the default login tab saved by an admin is the one the login screen opens on", async ({ page }) => {
        await loginAsAdmin(page);
        await page.getByRole("button", { name: "Setting", exact: true }).click();
        await page.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "General" }).click();
        await dialog.getByRole("combobox", { name: "Default login tab" }).click();
        await page.getByRole("option", { name: "Email & Password" }).click();
        await dialog.getByRole("button", { name: "Save" }).click();
        await expect(dialog.getByText("Saved")).toBeVisible();

        await page.goto("/login");
        await expect(page.getByRole("tab", { name: "Email & Password" })).toHaveAttribute("aria-selected", "true");
    });
});
