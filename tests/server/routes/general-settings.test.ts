import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";

// SystemSetting lives in memory; the real store, router and readers run against it.
const rows = vi.hoisted(() => new Map<string, unknown>());

const envMock = vi.hoisted(() => ({
    ALLOW_GUEST: undefined as string | undefined,
    LOGIN_DEFAULT_TYPE: undefined as string | undefined,
    URL_SCHEMA: undefined as string | undefined,
    RESOLUTION_PRESETS: "480,720" as string | undefined,
    UPLOAD_CHUNK_MB: undefined as string | undefined,
}));

type Where = { where: { key: string } };

vi.mock("@/server/lib/env", () => ({ env: envMock }));
vi.mock("@/server/lib/token", () => ({ authorize: vi.fn(async () => ({ type: "jwt" })) }));
vi.mock("@/server/lib/db", () => ({
    prisma: {
        systemSetting: {
            findUnique: vi.fn(async ({ where }: Where) =>
                rows.has(where.key) ? { key: where.key, value: rows.get(where.key) } : null),
            upsert: vi.fn(async ({ where, update }: Where & { update: { value: unknown } }) => {
                rows.set(where.key, update.value);
            }),
        },
    },
}));

let app: OpenAPIHono;

function put(body: object) {
    return app.request("/admin/settings/general", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("General settings", () => {
    beforeEach(async () => {
        rows.clear();
        envMock.ALLOW_GUEST = undefined;

        // Re-imported per test so the settings cache starts empty.
        vi.resetModules();
        const { settingsRouter } = await import("@/server/routes/admin/settings");
        const { authRouter } = await import("@/server/routes/auth");
        const { configRouter } = await import("@/server/routes/config");
        app = new OpenAPIHono()
            .route("/admin/settings", settingsRouter)
            .route("/auth", authRouter)
            .route("/config", configRouter);
    });

    it("rejects presets that are not widths and a chunk size that is not a positive integer", async () => {
        expect((await put({ resolutionPresets: "480,big" })).status).toBe(400);
        expect((await put({ uploadChunkMb: "0" })).status).toBe(400);
        expect(rows.size).toBe(0);
    });

    it("answers guest-enabled from the saved value over env, and with that field only", async () => {
        envMock.ALLOW_GUEST = "true";
        await put({ allowGuest: "false", urlSchema: "editor://open/{scenePath}" });

        const res = await app.request("/auth/guest-enabled");

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ enabled: false });
    });

    it("answers resolution-presets from env until a value is saved, as numbers", async () => {
        expect(await (await app.request("/config/resolution-presets")).json()).toEqual({ presets: [480, 720] });

        await put({ resolutionPresets: "1080" });

        expect(await (await app.request("/config/resolution-presets")).json()).toEqual({ presets: [1080] });
    });
});
