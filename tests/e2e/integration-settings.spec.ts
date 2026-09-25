import { test, expect } from "@playwright/test";

// Seeded admin user (see prisma/seed.ts).
const ADMIN = { email: "Bocchi@example.com", password: "pass123" };

async function openJiraSettings(page: import("@playwright/test").Page) {
    await page.getByRole("button", { name: "Setting", exact: true }).click();
    await page.getByRole("button", { name: "Administration" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("tab", { name: "Jira" }).click();
    await expect(dialog.getByRole("textbox", { name: "URL" })).toBeVisible();
    return dialog;
}

async function apiToken(request: import("@playwright/test").APIRequestContext) {
    return (await (await request.post("/api/v1/auth/login/password", { data: ADMIN })).json()).token as string;
}

async function login(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
}

test.describe("integration settings", () => {
    test("a failed Test & save leaves the settings as they were", async ({ page, request }) => {
        // Start unlocked whatever an earlier run saved; a saved token locks the URL and token fields.
        await request.delete("/api/v1/admin/settings/jira", { headers: { Authorization: `Bearer ${await apiToken(request)}` } });

        await login(page);
        const dialog = await openJiraSettings(page);

        // Nothing listens on port 9, so the test fails without a real Jira.
        await dialog.getByRole("textbox", { name: "URL" }).fill("http://127.0.0.1:9");
        await dialog.getByRole("textbox", { name: "Token" }).fill("e2e-token");
        await dialog.getByRole("textbox", { name: "Project", exact: true }).fill("E2E");
        await dialog.getByRole("button", { name: "Test & save" }).click();
        await expect(dialog.getByText(/nothing was saved/)).toBeVisible({ timeout: 20_000 });

        await page.reload();
        const reopened = await openJiraSettings(page);
        await expect(reopened.getByRole("textbox", { name: "URL" })).not.toHaveValue("http://127.0.0.1:9");
        await expect(reopened.getByRole("textbox", { name: "Token" })).not.toHaveAttribute("placeholder", "********");
    });

    test("Reset clears the saved token and unlocks the url and token", async ({ page, request }) => {
        // Saving from the screen needs a reachable Jira, so the connection is saved through the API instead.
        const headers = { Authorization: `Bearer ${await apiToken(request)}` };
        await request.delete("/api/v1/admin/settings/jira", { headers });
        const saved = await request.put("/api/v1/admin/settings/jira", {
            headers,
            data: { baseUrl: "https://e2e-jira.example.com", token: "e2e-token" },
        });
        expect(saved.status()).toBe(200);

        await login(page);
        const dialog = await openJiraSettings(page);
        const url = dialog.getByRole("textbox", { name: "URL" });
        const tokenInput = dialog.getByRole("textbox", { name: "Token" });
        await expect(url).toBeDisabled();

        await dialog.getByRole("button", { name: "Reset" }).click();
        await dialog.getByRole("button", { name: "Reset" }).click();

        await expect(url).toBeEnabled();
        await expect(url).toHaveValue("https://e2e-jira.example.com");
        await expect(tokenInput).not.toHaveAttribute("placeholder", "********");
    });
});
