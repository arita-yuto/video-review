import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const [installDir, version] = process.argv.slice(2);
if (!installDir || !version) {
    console.error("usage: node check.mjs <install dir> <version>");
    process.exit(1);
}

const base = "http://127.0.0.1:3489";
const admin = { email: "admin@example.com", password: "bundle-check-pass" };

function check(ok, message) {
    if (!ok) {
        throw new Error(message);
    }
    console.log(`ok: ${message}`);
}

async function call(method, route, body, token) {
    const headers = { "content-type": "application/json" };
    if (token) {
        headers.authorization = `Bearer ${token}`;
    }

    const res = await fetch(base + route, { method, headers, body: body && JSON.stringify(body) });
    return { status: res.status, body: await res.text() };
}

async function waitForServer() {
    for (let i = 0; i < 60; i++) {
        try {
            if ((await fetch(base + "/api/v1/version")).ok) {
                return;
            }
        } catch {
            // Not listening yet.
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("the server did not answer within 60 seconds");
}

await waitForServer();

const reported = JSON.parse((await call("GET", "/api/v1/version")).body).version;
check(reported === version, `the server reports ${version} (got ${reported})`);

const bootstrap = await call("POST", "/api/v1/admin/bootstrap", { email: admin.email, pass: admin.password });
check(bootstrap.status === 200, `bootstrap creates the first admin (${bootstrap.status} ${bootstrap.body})`);

const login = await call("POST", "/api/v1/auth/login/password", admin);
check(login.status === 200, `the admin signs in through the API (${login.status})`);
const token = JSON.parse(login.body).token;

const saved = await call("PUT", "/api/v1/admin/settings/slack", { token: "xoxb-bundle-check" }, token);
check(saved.status === 200, `a secret setting is saved (${saved.status} ${saved.body})`);
check(fs.existsSync(path.join(installDir, "secrets", "secret.key")), "the secret key is kept in the install folder");

const browser = await chromium.launch();
try {
    const page = await browser.newPage();
    const failures = [];
    page.on("response", (res) => {
        if (res.status() >= 400) {
            failures.push(`${res.status()} ${res.url()}`);
        }
    });
    page.on("pageerror", (error) => failures.push(`page error: ${error.message}`));

    await page.goto(base + "/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(admin.email);
    await page.locator('input[type="password"]').fill(admin.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/, { timeout: 30_000 });
    // The review screen checks the token after it loads and returns to the login screen when that fails.
    await page.waitForLoadState("networkidle");
    check(/\/video-review\/review\b/.test(page.url()), "signing in through the login screen opens the review screen");
    check(failures.length === 0, `the screens load without failed requests or errors${failures.length ? ":\n" + failures.join("\n") : ""}`);
} finally {
    await browser.close();
}
