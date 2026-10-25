import { test, expect, type Browser, type Page } from "@playwright/test";
import { uploadVideo } from "./upload-video";

// Seeded users (see prisma/seed.ts); two people, so each has its own browser.
const WRITER = { email: "Bocchi@example.com", password: "pass123" };
const READER = { email: "Kita@example.com", password: "pass123" };

async function login(browser: Browser, user: { email: string; password: string }): Promise<Page> {
    const page = await (await browser.newContext()).newPage();
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
    return page;
}

test("a comment posted on one screen shows up on another screen of the video without a reload", async ({ browser, request }) => {
    const videoId = await uploadVideo(request, `e2e-live-comments-${Date.now()}`);
    const writer = await login(browser, WRITER);
    const reader = await login(browser, READER);
    await writer.goto(`/video-review/review/${videoId}`);
    // The server registers a stream as it answers it, so from then on the reader is told of changes.
    const streamOpen = reader.waitForResponse((r) => r.url().includes(`/videos/${videoId}/stream`));
    await reader.goto(`/video-review/review/${videoId}`);
    await streamOpen;

    await writer.getByPlaceholder("Edit comment").fill("posted while you watch");
    await writer.getByRole("button", { name: "Add comment" }).click();

    await expect(reader.locator('[data-slot="timeline-card"]', { hasText: "posted while you watch" })).toBeVisible();
});
