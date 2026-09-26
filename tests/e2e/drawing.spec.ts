import { test, expect } from "@playwright/test";

// Seeded admin user (see prisma/seed.ts).
const USER = { email: "Bocchi@example.com", password: "pass123" };
const CANVAS = '[data-slot="review-main"] canvas';

async function login(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(USER.email);
    await page.locator('input[type="password"]').fill(USER.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
}

// The seed ships no media bytes, so the player keeps the <video> element's default box;
// the canvas is still fitted to it and can be drawn on.
async function openFirstVideo(page: import("@playwright/test").Page) {
    await page.locator('[data-slot="thumbnails-toggle"]').click();
    await page.locator('[data-slot="thumbnails-panel"]').getByRole("button", { name: /Archived Playtest/ }).first().click();
    await page.waitForFunction((sel) => {
        const c = document.querySelector<HTMLCanvasElement>(sel);
        return c !== null && c.width > 0;
    }, CANVAS);
}

/** Number of canvas pixels with any opacity. */
async function painted(page: import("@playwright/test").Page) {
    return page.evaluate((sel) => {
        const c = document.querySelector<HTMLCanvasElement>(sel)!;
        const data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++;
        return n;
    }, CANVAS);
}

async function drawStroke(page: import("@playwright/test").Page) {
    const box = (await page.locator(CANVAS).boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5, { steps: 10 });
    await page.mouse.up();
}

function commentCard(page: import("@playwright/test").Page, text: string) {
    return page.locator('[data-slot="timeline-card"]', { hasText: text });
}

async function startEditing(page: import("@playwright/test").Page, text: string) {
    const card = commentCard(page, text);
    await card.click();
    // Radix opens the menu on pointerdown, which the card's own click handling
    // interferes with; the keyboard path is unambiguous.
    await card.locator('[data-slot="dropdown-menu-trigger"]').focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: "Edit" }).click();
    await expect(page.getByText("Drawing", { exact: true })).toBeVisible();
}

test.describe("frame drawing", () => {
    test("draws, undoes, saves and keeps showing the drawing", async ({ page }, testInfo) => {
        // The database is reset once per run, so a retry must not collide with the
        // comment a failed attempt left behind.
        const text = `drawing e2e ${testInfo.retry}`;
        await login(page);
        await openFirstVideo(page);

        await page.getByPlaceholder("Edit comment").fill(text);
        await page.getByRole("button", { name: "Add Comment" }).click();
        await expect(commentCard(page, text)).toBeVisible();

        await startEditing(page, text);
        expect(await painted(page)).toBe(0);

        await drawStroke(page);
        const withStroke = await painted(page);
        expect(withStroke).toBeGreaterThan(0);

        await page.keyboard.press("Control+z");
        await expect.poll(() => painted(page)).toBe(0);
        await page.keyboard.press("Control+y");
        await expect.poll(() => painted(page)).toBe(withStroke);

        // A first drawing gives the comment a new path; the player must show it
        // straight away, without a click on the comment.
        await page.getByRole("button", { name: "Update Comment" }).click();
        await expect(page.getByText("Video list")).toBeVisible();
        await expect.poll(() => painted(page)).toBeGreaterThan(0);

        // And it was really stored: a fresh page draws it from the server.
        await page.reload();
        await page.waitForFunction((sel) => document.querySelector<HTMLCanvasElement>(sel)?.width, CANVAS);
        await commentCard(page, text).click();
        await expect.poll(() => painted(page), { timeout: 10_000 }).toBeGreaterThan(0);
    });
});
