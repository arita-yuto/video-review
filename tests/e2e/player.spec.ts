import { test, expect } from "@playwright/test";
import { uploadVideo } from "./upload-video";

// Seeded admin user (see prisma/seed/user.ts).
const USER = { email: "Bocchi@example.com", password: "pass123" };
const STAGE = '[data-slot="video-stage"]';

async function login(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(USER.email);
    await page.locator('input[type="password"]').fill(USER.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
}

// The seed ships no media bytes; the player still shows the controls, the stage and a 16:9 box
// for the video.
async function openFirstVideo(page: import("@playwright/test").Page) {
    // The thumbnail panel shows only the videos in folders open in the sidebar.
    const closed = page.locator('[data-slot="browse-tree"] [aria-expanded="false"]');
    await expect(closed.first()).toBeVisible();
    while (await closed.count() > 0) {
        await closed.first().click();
    }
    await page.locator('[data-slot="thumbnails-toggle"]').click();
    await page.locator('[data-slot="thumbnails-panel"]').getByRole("button", { name: /Archived Playtest/ }).first().click();
    await expect(page.getByRole("button", { name: "Fullscreen" })).toBeVisible();
}

test.describe("player", () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await openFirstVideo(page);
    });

    test("dropdowns open inside the fullscreen player", async ({ page }) => {
        await page.getByRole("button", { name: "Fullscreen" }).click();
        await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);

        await page.getByRole("button", { name: "Playback settings" }).click();
        await page.getByRole("combobox", { name: "Playback rate" }).click();
        const listbox = page.getByRole("listbox");
        await expect(listbox).toBeVisible();
        // Only the fullscreen element's subtree is shown, so a list portalled to body would be unseen.
        expect(await listbox.evaluate((el) => document.fullscreenElement!.contains(el))).toBe(true);
    });

    test("clicking beside the picture plays and pauses", async ({ page }) => {
        const stage = (await page.locator(STAGE).boundingBox())!;
        const video = (await page.locator(`${STAGE} video`).boundingBox())!;
        // A point in the black bar: left of the picture when the stage is wider, above it otherwise.
        const bar = stage.width - video.width > stage.height - video.height
            ? { x: stage.x + (stage.width - video.width) / 4, y: stage.y + stage.height / 2 }
            : { x: stage.x + stage.width / 2, y: stage.y + (stage.height - video.height) / 4 };

        expect(await page.evaluate((p) => document.elementFromPoint(p.x, p.y)?.getAttribute("data-slot"), bar)).toBe("video-stage");

        await page.mouse.click(bar.x, bar.y);
        await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();

        await page.mouse.click(bar.x, bar.y);
        await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
    });

    test("switching revision while playing pauses at the same position", async ({ page, request }) => {
        const title = `e2e-revision-${Date.now()}`;
        const videoId = await uploadVideo(request, title);
        await uploadVideo(request, title);
        await page.goto(`/video-review/review/${videoId}`);
        const video = page.locator(`${STAGE} video`);

        await page.getByRole("button", { name: "Play", exact: true }).click();
        await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(1);
        const before = await video.evaluate((v: HTMLVideoElement) => v.currentSrc);

        const picker = page.getByRole("combobox").filter({ hasText: /^rev_/ });
        const current = await picker.textContent();
        await picker.click();
        await page.getByRole("option").filter({ hasNotText: current ?? "" }).click();

        await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentSrc)).not.toBe(before);
        await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
        await expect.poll(() => video.evaluate((v: HTMLVideoElement) => ({ paused: v.paused, kept: v.currentTime > 1 }))).toEqual({ paused: true, kept: true });
    });
});
