import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Seeded admin user (see prisma/seed/user.ts).
const USER = { email: "Bocchi@example.com", password: "pass123" };

const PANEL = '[data-slot="thumbnails-panel"]';

// Every seeded revision points at videos/demo/rev_001.mp4 (prisma/seed/demo/video.ts). The preview
// width falls back to NEXT_PUBLIC_VIDEO_REVIEW_RESOLUTION_PRESETS while nothing is saved, so the
// spec needs the same value in .env.test.
const PRESETS = (process.env.NEXT_PUBLIC_VIDEO_REVIEW_RESOLUTION_PRESETS ?? "").split(",").map(Number).filter(w => w > 0);
const VARIANT_KEY = PRESETS.length > 0 ? `videos/demo/rev_001_${Math.min(...PRESETS)}p.mp4` : undefined;
const LOCAL_ROOT = process.env.VIDEO_REVIEW_STORAGE === "local" ? process.env.VIDEO_REVIEW_LOCAL_ROOTDIR : undefined;
const VARIANT_PATH = VARIANT_KEY && LOCAL_ROOT ? path.join(LOCAL_ROOT, VARIANT_KEY) : undefined;

function toggle(page: import("@playwright/test").Page) {
    return page.getByRole("button", { name: "Thumbnails", exact: true });
}

// The panel shows only the videos the sidebar shows, so cards need their folders open there.
async function openAllFolders(page: import("@playwright/test").Page) {
    const closed = page.locator('[data-slot="browse-tree"] [aria-expanded="false"]');
    await expect(closed.first()).toBeVisible();
    while (await closed.count() > 0) {
        await closed.first().click();
    }
}

function firstCard(page: import("@playwright/test").Page) {
    return page.locator(PANEL).getByRole("button", { name: /Archived Playtest/ }).first();
}

async function login(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(USER.email);
    await page.locator('input[type="password"]').fill(USER.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
    // The video list loads after the client-side auth guard resolves.
    await expect(toggle(page)).toBeVisible();
}

test.describe("thumbnails float panel", () => {
    test("opens from the header button without pushing the player aside", async ({ page }) => {
        await login(page);
        await expect(page.locator(PANEL)).toHaveCount(0);

        const player = page.getByText("Please select a video");
        const before = await player.boundingBox();

        await toggle(page).click();
        await expect(page.locator(PANEL)).toBeVisible();
        expect(await player.boundingBox()).toEqual(before);
    });

    test("survives the filter popover, which renders in a portal", async ({ page }) => {
        await login(page);
        await toggle(page).click();
        await expect(page.locator(PANEL)).toBeVisible();

        await page.locator('[data-slot="sidebar"] [data-slot="popover-trigger"]').first().click();
        const popover = page.locator('[data-slot="popover-content"]');
        await expect(popover).toBeVisible();
        await expect(page.locator(PANEL)).toBeVisible();

        await popover.click({ position: { x: 5, y: 5 } });
        await expect(page.locator(PANEL)).toBeVisible();

        // Escape goes to the topmost layer: first press closes the popover, second the panel.
        await page.keyboard.press("Escape");
        await expect(popover).toHaveCount(0);
        await expect(page.locator(PANEL)).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(page.locator(PANEL)).toHaveCount(0);
    });

    test("picking a video opens it", async ({ page }) => {
        await login(page);
        await openAllFolders(page);
        await toggle(page).click();

        const card = firstCard(page);
        const title = (await card.getAttribute("aria-label"))!;
        await card.click();

        await expect(page.locator(PANEL)).toHaveCount(0);
        await expect(page.getByRole("heading", { level: 2 })).toContainText(title);
    });

    test("flags videos with unread comments", async ({ page }) => {
        await login(page);
        await openAllFolders(page);
        await toggle(page).click();

        await expect(page.locator(PANEL).getByLabel("Unread comments").first()).toBeVisible();
    });

    test("follows the list filter", async ({ page }) => {
        await login(page);
        await openAllFolders(page);
        await toggle(page).click();
        await expect(page.locator(PANEL)).toBeVisible();

        const outside = page.locator(PANEL).getByRole("button", { name: "Archived Playtest #020", exact: true });
        await expect(outside).toBeVisible();

        // The panel shows the same list the tree does, so the text filter narrows both.
        await page.getByPlaceholder("Filter video...").fill("Archived Playtest #01");
        await expect(page.locator(PANEL).getByRole("button", { name: "Archived Playtest #010", exact: true })).toBeVisible();
        await expect(outside).toHaveCount(0);
    });

    test("shows only the videos the sidebar shows in its open folders", async ({ page }) => {
        await login(page);
        // The top-level folder holds only folders; the videos are one level down.
        await page.locator('[data-slot="browse-tree"] [aria-expanded="false"]').first().click();
        await page.locator('[data-slot="browse-tree"] [aria-expanded="false"]').first().click();
        await toggle(page).click();

        const rows = page.locator('[data-slot="browse-tree"] [data-sidebar="menu-button"][data-size="auto"]');
        await expect(rows.first()).toBeVisible();
        await expect(page.locator(PANEL).locator('[data-slot="thumbnail-card"]')).toHaveCount(await rows.count());
    });

    test("hovering a cell shows its details, and clicking them opens the video", async ({ page }) => {
        await login(page);
        await openAllFolders(page);
        await toggle(page).click();

        const card = firstCard(page);
        const title = (await card.getAttribute("aria-label"))!;
        await card.hover();

        const detail = page.locator('[data-slot="thumbnail-detail"]');
        await expect(detail).toContainText(title);

        await detail.click();
        await expect(page.locator(PANEL)).toHaveCount(0);
        await expect(page.getByRole("heading", { level: 2 })).toContainText(title);
    });

    test.describe("with a preview variant in storage", () => {
        test.skip(!VARIANT_PATH, "needs local storage and NEXT_PUBLIC_VIDEO_REVIEW_RESOLUTION_PRESETS in .env.test");

        test.beforeAll(() => {
            fs.mkdirSync(path.dirname(VARIANT_PATH!), { recursive: true });
            // 30 s fade to orange, 64x36, VP9 (Playwright's Chromium has no H.264):
            // ffmpeg -f lavfi -i "color=c=#ff8800:s=64x36:r=10:d=30,fade=t=in:st=0:d=30" -pix_fmt yuv420p -c:v libvpx-vp9 -b:v 50k -movflags frag_keyframe+empty_moov -f mp4 preview.mp4
            fs.copyFileSync(path.join(import.meta.dirname, "..", "fixtures", "preview.mp4"), VARIANT_PATH!);
        });
        test.afterAll(() => fs.rmSync(VARIANT_PATH!, { force: true }));

        test("plays a preview in the detail card", async ({ page }) => {
            await login(page);
            await openAllFolders(page);
            await toggle(page).click();
            await firstCard(page).hover();

            const preview = page.locator('[data-slot="thumbnail-preview"]');
            await expect.poll(() => preview.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
        });
    });
});
