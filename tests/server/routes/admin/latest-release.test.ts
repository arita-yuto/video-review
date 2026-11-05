import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";

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

    it("asks GitHub once a day, even after a failure", async () => {
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
