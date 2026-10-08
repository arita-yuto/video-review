import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Seeded admin user (see prisma/seed.ts).
const ADMIN = { email: "Bocchi@example.com", password: "pass123" };

const VIDEO = path.join(process.cwd(), "tests/e2e/fixtures/preview.mp4");

async function loginAsAdmin(page: Page) {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
}

// Uploading the same title into the same folder again adds a revision to that video.
async function upload(page: Page, title: string, folderKey: string) {
    await page.getByRole("button", { name: "Upload video" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[type="file"]').setInputFiles({
        name: `${title}.mp4`,
        mimeType: "video/mp4",
        buffer: fs.readFileSync(VIDEO),
    });
    await dialog.getByPlaceholder("Folder key", { exact: false }).fill(folderKey);
    await dialog.getByRole("button", { name: "Upload", exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });
}

test.describe("revision diff-view", () => {
    test("Compare on the review page opens both revisions side by side", async ({ page }) => {
        const title = `e2e-diff-${Date.now()}`;
        const folderKey = "e2e-diff";

        await loginAsAdmin(page);
        await upload(page, title, folderKey);
        await upload(page, title, folderKey);

        await page.getByRole("button", { name: "Compare" }).click();

        await page.waitForURL(/\/video-review\/diff\/[^?]+\?left=1&right=2/);
        const videos = page.locator("video");
        await expect(videos).toHaveCount(2);
        await expect(page.getByRole("combobox", { name: "Left revision" })).toContainText("rev_1");
        await expect(page.getByRole("combobox", { name: "Right revision" })).toContainText("rev_2");
    });
});
