import { test, expect, type Browser, type Page } from "@playwright/test";
import { uploadVideo } from "./upload-video";

// Seeded admin users (see prisma/seed.ts); two people, so each has its own browser.
const HOST = { email: "Bocchi@example.com", password: "pass123" };
const GUEST = { email: "Kita@example.com", password: "pass123" };

// Both browsers' console and failed requests, attached only to a failed run.
const consoleLines: string[] = [];

async function login(browser: Browser, user: { email: string; password: string }): Promise<Page> {
    const page = await (await browser.newContext()).newPage();
    page.on("console", (m) => consoleLines.push(`${user.email} ${m.type()}: ${m.text()}`));
    page.on("response", (r) => {
        if (r.status() >= 400) {
            consoleLines.push(`${user.email} ${r.request().method()} ${r.url()} -> ${r.status()}`);
        }
    });
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
    return page;
}

function player(page: Page) {
    return page.locator('[data-slot="video-stage"] video');
}

function syncButton(page: Page) {
    return page.getByRole("button", { name: "Sync playback" });
}

// The guest of a synced pair counts its own sync posts; a follower that only follows sends none.
interface SyncedPair {
    host: Page;
    guest: Page;
    guestPosts: () => number;
    // Changes made while this is false are not the guest viewer's, as with a script or a load.
    setGuestActive: (active: boolean) => Promise<void>;
}

async function openSyncedPair(browser: Browser, videoId: string): Promise<SyncedPair> {
    const host = await login(browser, HOST);
    await host.goto(`/video-review/review/${videoId}`);
    await syncButton(host).click();
    const dialog = host.getByRole("dialog");
    const link = await dialog.getByRole("textbox").inputValue();
    await host.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    const guest = await login(browser, GUEST);
    // Headless Chromium reports every change as the viewer's; the guards must hold even so.
    await guest.addInitScript(() => {
        const w = window as unknown as { viewerActive: boolean };
        w.viewerActive = true;
        Object.defineProperty(navigator, "userActivation", { get: () => ({ isActive: w.viewerActive, hasBeenActive: w.viewerActive }) });
    });
    let posts = 0;
    guest.on("request", (req) => {
        if (req.url().includes("/sync/state")) {
            posts++;
        }
    });
    await guest.goto(link);
    await guest.getByRole("button", { name: "Join" }).click();
    await expect(syncButton(host)).toContainText("2");

    return {
        host,
        guest,
        guestPosts: () => posts,
        setGuestActive: (active) => guest.evaluate((a) => { (window as unknown as { viewerActive: boolean }).viewerActive = a; }, active),
    };
}

// Seeks with a real click so the change goes through the store.
async function seekBar(page: Page, time: number) {
    const duration = await player(page).evaluate((v: HTMLVideoElement) => v.duration);
    const track = page.locator('[data-slot="slider-track"]').first();
    const box = (await track.boundingBox())!;
    await page.mouse.click(box.x + box.width * (time / duration), box.y + box.height / 2);
}

async function positions(pair: SyncedPair) {
    const [host, guest] = await Promise.all([
        player(pair.host).evaluate((v: HTMLVideoElement) => v.currentTime),
        player(pair.guest).evaluate((v: HTMLVideoElement) => v.currentTime),
    ]);
    return { host, guest };
}

test.describe("synced playback", () => {
    test.afterEach(async ({}, testInfo) => {
        if (testInfo.status !== testInfo.expectedStatus) {
            await testInfo.attach("browser log", { body: consoleLines.join("\n"), contentType: "text/plain" });
        }
        consoleLines.length = 0;
    });

    test("one screen's play, pause, seek and speed reach a screen that opened the sync link", async ({ browser, request }) => {
        const videoId = await uploadVideo(request, `e2e-sync-${Date.now()}`);
        const host = await login(browser, HOST);
        await host.goto(`/video-review/review/${videoId}`);

        // The first one in gets the link to hand out.
        await syncButton(host).click();
        const dialog = host.getByRole("dialog");
        const link = await dialog.getByRole("textbox").inputValue();
        await host.keyboard.press("Escape");
        await expect(dialog).toBeHidden();

        // The link asks first; the Join click is also the gesture that lets the guest play.
        const guest = await login(browser, GUEST);
        await guest.goto(link);
        await guest.getByRole("button", { name: "Join" }).click();
        await expect(syncButton(guest)).toHaveAttribute("aria-pressed", "true");
        await expect(syncButton(host)).toContainText("2");

        await host.getByRole("button", { name: "Play", exact: true }).click();
        await expect.poll(() => player(guest).evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);

        // Compared with the time the host sent, which is what the guest follows.
        const paused = host.waitForRequest((req) => req.url().includes("/sync/state") && req.postDataJSON().playing === false);
        await host.getByRole("button", { name: "Pause", exact: true }).click();
        const stoppedAt = (await paused).postDataJSON().time as number;
        await expect.poll(() => player(guest).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
        // Well inside one frame; a follower can rarely settle a few milliseconds off.
        await expect.poll(() => player(guest).evaluate((v: HTMLVideoElement, t) => Math.abs(v.currentTime - t), stoppedAt)).toBeLessThanOrEqual(0.01);

        const sought = host.waitForRequest((req) => req.url().includes("/sync/state") && req.postDataJSON().time !== stoppedAt);
        await seekBar(host, 20);
        const soughtTo = (await sought).postDataJSON().time as number;
        await expect.poll(() => player(guest).evaluate((v: HTMLVideoElement, t) => Math.abs(v.currentTime - t), soughtTo)).toBeLessThanOrEqual(0.01);

        await host.getByRole("button", { name: "Playback settings" }).click();
        await host.getByRole("combobox", { name: "Playback rate" }).click();
        await host.getByRole("option", { name: "2x", exact: true }).click();
        await expect.poll(() => player(guest).evaluate((v: HTMLVideoElement) => v.playbackRate)).toBe(2);
    });

    test("a screen that falls behind catches up on its own without pulling the others back", async ({ browser, request }) => {
        test.setTimeout(90_000);
        const videoId = await uploadVideo(request, `e2e-sync-drift-${Date.now()}`);
        const pair = await openSyncedPair(browser, videoId);

        await pair.host.getByRole("button", { name: "Play", exact: true }).click();
        await expect.poll(() => player(pair.guest).evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
        await pair.host.waitForTimeout(4000);
        const postsBefore = pair.guestPosts();

        // Past the gap a screen leaves alone, so it jumps back; a correction mistaken for the viewer's would be sent.
        await pair.setGuestActive(false);
        await player(pair.guest).evaluate((v: HTMLVideoElement) => new Promise((resolve) => {
            v.addEventListener("seeked", resolve, { once: true });
            v.currentTime -= 3;
        }));
        await pair.setGuestActive(true);

        // Recorded outside the poll: a failed expect inside it only retries.
        let hostBefore = (await positions(pair)).host;
        let hostWentBack = false;
        await expect.poll(async () => {
            const now = await positions(pair);
            if (now.host < hostBefore) {
                hostWentBack = true;
            }
            hostBefore = now.host;
            return Math.abs(now.host - now.guest);
        }, { timeout: 30_000, intervals: [500] }).toBeLessThan(0.15);
        expect(hostWentBack).toBe(false);
        expect(pair.guestPosts()).toBe(postsBefore);
    });

    test("switching revision pauses every screen at the same position, without an old position coming back", async ({ browser, request }) => {
        const title = `e2e-sync-revision-${Date.now()}`;
        const videoId = await uploadVideo(request, title);
        await uploadVideo(request, title);
        const pair = await openSyncedPair(browser, videoId);

        await pair.host.getByRole("button", { name: "Play", exact: true }).click();
        await expect.poll(() => player(pair.guest).evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
        await pair.host.waitForTimeout(3000);
        const postsBefore = pair.guestPosts();

        const picker = pair.host.getByRole("combobox").filter({ hasText: /^rev_/ });
        const current = await picker.textContent();
        await picker.click();
        await pair.host.getByRole("option").filter({ hasNotText: current ?? "" }).click();
        await expect(pair.guest.getByRole("combobox").filter({ hasText: /^rev_/ })).not.toHaveText(current ?? "");

        for (const page of [pair.host, pair.guest]) {
            await expect.poll(() => player(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
        }
        await pair.host.waitForTimeout(1000);
        const { host, guest } = await positions(pair);
        expect(host).toBeGreaterThan(2);
        expect(guest).toBeCloseTo(host, 1);
        expect(pair.guestPosts()).toBe(postsBefore);
    });
});
