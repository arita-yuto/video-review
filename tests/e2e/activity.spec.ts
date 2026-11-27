import { test, expect, type Page } from "@playwright/test";
import { uploadVideo } from "./upload-video";

// Seeded admin user (see prisma/seed/user.ts).
const USER = { email: "Bocchi@example.com", password: "pass123" };

async function login(page: Page) {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(USER.email);
    await page.locator('input[type="password"]').fill(USER.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
}

async function openActivity(page: Page) {
    await page.getByRole("button", { name: "Activity", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Activity" });
    await expect(dialog.locator('[data-slot="activity-row"]').first()).toBeVisible();

    return dialog;
}

// The seen time is stored when the dialog closes, and the next open reads it.
async function closeActivity(page: Page) {
    const seenStored = page.waitForResponse((response) => {
        return response.url().includes("/api/v1/activity/seen") && response.request().method() === "PUT";
    });

    await page.keyboard.press("Escape");

    expect((await seenStored).ok()).toBe(true);
    await expect(page.getByRole("dialog", { name: "Activity" })).toBeHidden();
}

test("what happened since Activity was last closed is marked new until it is closed again", async ({ page, request }) => {
    const stamp = Date.now();
    const comment = `noticed since last close ${stamp}`;
    const videoId = await uploadVideo(request, `e2e-activity-${stamp}`);

    await login(page);
    await page.goto(`/video-review/review/${videoId}`);

    await openActivity(page);
    await closeActivity(page);

    await page.getByPlaceholder("Edit comment").fill(comment);
    await page.getByRole("button", { name: "Add comment" }).click();
    await expect(page.locator('[data-slot="timeline-card"]', { hasText: comment })).toBeVisible();

    const withNewComment = await openActivity(page);
    const newRow = withNewComment.locator('[data-slot="activity-row"]', { hasText: comment });

    await expect(newRow.getByText("NEW", { exact: true })).toBeVisible();
    await expect(withNewComment.locator('[data-slot="activity-new-divider"]')).toBeVisible();

    await closeActivity(page);

    const afterSeen = await openActivity(page);
    const seenRow = afterSeen.locator('[data-slot="activity-row"]', { hasText: comment });

    await expect(seenRow).toBeVisible();
    await expect(seenRow.getByText("NEW", { exact: true })).toHaveCount(0);
});
