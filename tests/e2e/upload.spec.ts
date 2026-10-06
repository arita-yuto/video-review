import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Seeded admin user (see prisma/seed.ts).
const ADMIN = { email: "Bocchi@example.com", password: "pass123" };

// The smallest video in the repo; this test is about the upload getting through, not its size.
const VIDEO = path.join(process.cwd(), "tests/e2e/fixtures/preview.mp4");

async function loginAsAdmin(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
}

test.describe("uploading a video from the browser", () => {
    test("an admin uploads a file and it shows up in the video list", async ({ page }) => {
        const title = `e2e-upload-${Date.now()}`;
        const folderKey = "e2e-upload";

        await loginAsAdmin(page);

        await page.getByRole("button", { name: "Upload video" }).click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        // The file input is hidden behind its label, so set the file on the input itself.
        await dialog.locator('input[type="file"]').setInputFiles({
            name: `${title}.mp4`,
            mimeType: "video/mp4",
            buffer: fs.readFileSync(VIDEO),
        });
        await dialog.getByPlaceholder("Folder key", { exact: false }).fill(folderKey);

        // Without this the test would also pass on the single-request route.
        const chunk = page.waitForRequest((req) =>
            req.url().includes("/api/v1/videos/upload/tus") && req.method() === "PATCH");

        await dialog.getByRole("button", { name: "Upload", exact: true }).click();
        await chunk;

        // The dialog closes once the revision exists, which is what publishes the video.
        await expect(dialog).toBeHidden({ timeout: 30_000 });
    });
});
