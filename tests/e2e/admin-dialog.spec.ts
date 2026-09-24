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
    await expect(page.getByRole("button", { name: "Setting", exact: true })).toBeVisible();
}

async function loginAsGuest(page: import("@playwright/test").Page) {
    await page.goto("/login");
    // The default tab is configurable, so pick "Guest" explicitly.
    await page.getByRole("tab", { name: "Guest" }).click();
    await page.locator("#displayName").fill("E2E Guest");
    await page.getByRole("button", { name: "Login" }).click();
    await page.waitForURL(/\/video-review\/review\b/);
    await expect(page.getByRole("button", { name: "Setting", exact: true })).toBeVisible();
}

async function openSettings(page: import("@playwright/test").Page) {
    await page.getByRole("button", { name: "Setting", exact: true }).click();
    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover).toBeVisible();
    // The rows appear once the popover's own auth check resolves.
    await expect(popover.getByText("Logout")).toBeVisible();
    return popover;
}

// A retry runs against the same seeded DB, so each attempt takes a different video.
function seededTitle(base: number) {
    return `Feature Review #${String(base + 9 * test.info().retry).padStart(3, "0")}`;
}

test.describe("admin settings dialog", () => {
    test("an admin creates a viewer and promotes them", async ({ page }) => {
        await loginAsAdmin(page);
        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");

        // A retry runs against the same seeded DB, so neither field may collide with the first attempt.
        const name = `E2E Viewer ${test.info().retry}`;
        const email = `e2e-viewer-${test.info().retry}@example.com`;
        await dialog.getByLabel("Display name").fill(name);
        await dialog.getByLabel("Email").fill(email);
        await dialog.getByLabel("Password").fill("viewer-pass");
        await dialog.getByRole("button", { name: "Create" }).click();

        const row = dialog.getByRole("row", { name: email });
        await expect(row).toBeVisible();
        await expect(row.getByRole("combobox")).toHaveText("Viewer");

        // The select updates optimistically, so the server response is what proves the promotion.
        const patched = page.waitForResponse(r => r.url().endsWith("/admin/role-update"));
        await row.getByRole("combobox").click();
        await page.getByRole("option", { name: "Admin" }).click();
        expect((await patched).status()).toBe(200);
        await expect(row.getByRole("combobox")).toHaveText("Admin");
    });

    test("deleting a video needs the exact word, and the video stays gone after a reload", async ({ page }) => {
        await loginAsAdmin(page);
        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "Videos" }).click();

        const title = seededTitle(9);
        await dialog.getByPlaceholder("Filter by title or folder...").fill(title);
        await dialog.getByRole("button", { name: `Delete every revision of ${title}` }).click();

        const confirm = page.getByRole("dialog").filter({ hasText: "Type Delete to confirm" });
        const word = confirm.getByLabel("Type Delete to confirm");
        const submit = confirm.getByRole("button", { name: "Delete", exact: true });
        await word.fill("delete");
        await expect(submit).toBeDisabled();
        await word.fill("Delete");
        await submit.click();
        // The confirm stays open until every purge has settled, and it hides the list behind it.
        await expect(confirm).toHaveCount(0);

        await expect(dialog.getByRole("row", { name: new RegExp(title) })).toHaveCount(0);
        await page.reload();
        const reopened = await openSettings(page);
        await reopened.getByRole("button", { name: "Administration" }).click();
        await dialog.getByRole("tab", { name: "Videos" }).click();
        await dialog.getByPlaceholder("Filter by title or folder...").fill(title);
        await expect(dialog.getByText("No video matches the filter.")).toBeVisible();
    });

    test("a guest does not see the entry", async ({ page }) => {
        await loginAsGuest(page);
        const popover = await openSettings(page);

        await expect(popover.getByRole("button", { name: "Administration" })).toHaveCount(0);
    });
});
