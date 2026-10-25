import { defineConfig, devices } from "@playwright/test";

// E2E smoke tests run against a locally built + started app.
// The DB is reset and seeded, and `next build` is run, by run-e2e.ts before
// Playwright starts. This config only owns starting `next start` and the browser.
// Use a dedicated E2E port so we never collide with (or reuse) a dev server
// already running on the app's normal port 3489.
const PORT = Number(process.env.E2E_PORT ?? 3490);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
    testDir: "tests/e2e",
    // Keep all test output under tests/test-results (single location, shared
    // with vitest's junit output) instead of Playwright's default root/test-results.
    outputDir: "tests/test-results/e2e-artifacts",
    // Fail fast in CI; allow a couple of retries for flake-resistance locally.
    retries: process.env.CI ? 2 : 1,
    // run-e2e.ts names the first-launch pass's file, so the second pass does not overwrite it.
    reporter: [["list"], ["junit", { outputFile: process.env.E2E_JUNIT_FILE ?? "tests/test-results/e2e-junit.xml" }]],
    use: {
        baseURL: BASE_URL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ],
    // Start the already-built app. run-e2e.ts guarantees the build + seeded DB
    // exist and passes the test DATABASE_URL through the environment.
    webServer: {
        command: `npx next start -p ${PORT}`,
        url: BASE_URL,
        timeout: 120_000,
        // Always start our own server on the dedicated port; never reuse a
        // stray/dev server (which would point at the wrong database).
        reuseExistingServer: false,
    },
});
