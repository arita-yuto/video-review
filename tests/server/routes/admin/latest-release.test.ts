import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import fs from "fs";
import os from "os";
import path from "path";

const checkEnabled = vi.hoisted(() => ({ value: true }));

vi.mock("@/server/lib/env", () => ({ env: { BUILD_VERSION: "v0.13.0", DEV_SERVER: false } }));
vi.mock("@/server/lib/token", () => ({ authorize: vi.fn(async () => ({ type: "jwt" })) }));
vi.mock("@/server/lib/integrations/general", () => ({ isUpdateCheckEnabled: async () => checkEnabled.value }));

const fetchMock = vi.fn();

let app: OpenAPIHono;

async function getLatest() {
    const res = await app.request("/latest-release");
    return { status: res.status, body: await res.json() };
}

beforeEach(async () => {
    // A fresh module each test, so the in-process cache of the previous test is gone.
    vi.resetModules();
    const { latestReleaseRouter } = await import("@/server/routes/admin/latest-release");
    app = new OpenAPIHono().route("/latest-release", latestReleaseRouter);
    checkEnabled.value = true;
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("GET /admin/latest-release", () => {
    it("does not call GitHub while the check is off", async () => {
        checkEnabled.value = false;

        expect(await getLatest()).toEqual({ status: 200, body: { latest: null, installable: false } });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns null instead of an error when GitHub cannot be reached", async () => {
        fetchMock.mockRejectedValue(new TypeError("fetch failed"));

        expect(await getLatest()).toEqual({ status: 200, body: { latest: null, installable: false } });
    });

    it("keeps a failed answer instead of asking GitHub again", async () => {
        fetchMock.mockRejectedValue(new TypeError("fetch failed"));

        await getLatest();
        await getLatest();

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("returns a newer release", async () => {
        const url = "https://github.com/arita-yuto/video-review/releases/tag/v0.14.0";
        fetchMock.mockResolvedValue(Response.json({ tag_name: "v0.14.0", html_url: url, body: "## What's Changed" }));

        expect(await getLatest()).toEqual({ status: 200, body: { latest: { version: "v0.14.0", url, notes: "## What's Changed" }, installable: false } });
    });
});

// A server the upgrade started: this module never ran POST /install, and BUILD_VERSION is v0.13.0.
describe("GET /admin/latest-release/install", () => {
    let installDir: string;

    beforeEach(() => {
        installDir = fs.mkdtempSync(path.join(os.tmpdir(), "install-"));
        fs.mkdirSync(path.join(installDir, "logs"));
        vi.spyOn(process, "cwd").mockReturnValue(installDir);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        fs.rmSync(installDir, { recursive: true, force: true });
    });

    async function getInstall(upgradeLog: string) {
        fs.writeFileSync(path.join(installDir, "logs", "upgrade.log"), upgradeLog);
        const res = await app.request("/latest-release/install");
        return await res.json();
    }

    it("reports failed when the upgrade went back to this release", async () => {
        const upgradeLog = "installing v0.14.0\nstopping web (pid 1)\nv0.14.0 did not start (no answer); starting v0.13.0 again\n";

        expect((await getInstall(upgradeLog)).failed).toBe(true);
    });

    it("reports this upgrade's lines and no failure when this release is the one installed", async () => {
        const upgradeLog = "installing v0.12.0\nv0.12.0 is running\ninstalling v0.13.0\nv0.13.0 is running\n";

        expect(await getInstall(upgradeLog)).toEqual({ log: "installing v0.13.0\nv0.13.0 is running", failed: false });
    });
});
