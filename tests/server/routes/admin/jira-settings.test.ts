import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { OpenAPIHono } from "@hono/zod-openapi";
import { handleServerError, ServerError } from "@/server/lib/server-error";

// Both tables live in memory, and the real settings modules and encryption run against them.
const db = vi.hoisted(() => ({
    settings: new Map<string, unknown>(),
    secrets: new Map<string, string>(),
}));

const envMock = vi.hoisted(() => ({
    JIRA_BASE_URL: "https://env.example.com" as string | undefined,
    JIRA_API_TOKEN: undefined as string | undefined,
    JIRA_PROJECT: undefined as string | undefined,
    JIRA_ASSIGNEE_USER: undefined as string | undefined,
}));

const authorizeMock = vi.hoisted(() => vi.fn());

type Where = { where: { key: string } };

vi.mock("@/server/lib/env", () => ({ env: envMock }));
vi.mock("@/server/lib/token", () => ({ authorize: authorizeMock }));
vi.mock("@/server/lib/db", () => ({
    prisma: {
        systemSetting: {
            findUnique: vi.fn(async ({ where }: Where) =>
                db.settings.has(where.key) ? { key: where.key, value: db.settings.get(where.key) } : null),
            upsert: vi.fn(async ({ where, update }: Where & { update: { value: unknown } }) => {
                db.settings.set(where.key, update.value);
            }),
            deleteMany: vi.fn(async ({ where }: Where) => {
                db.settings.delete(where.key);
            }),
        },
        systemSecret: {
            findUnique: vi.fn(async ({ where }: Where) =>
                db.secrets.has(where.key) ? { key: where.key, valueHash: db.secrets.get(where.key) } : null),
            upsert: vi.fn(async ({ where, update }: Where & { update: { valueHash: string } }) => {
                db.secrets.set(where.key, update.valueHash);
            }),
            deleteMany: vi.fn(async ({ where }: Where) => {
                db.secrets.delete(where.key);
            }),
            count: vi.fn(async ({ where }: Where) => (db.secrets.has(where.key) ? 1 : 0)),
        },
    },
}));

const TOKEN = "jira-token-abc123";

let app: OpenAPIHono;
let workDir: string;
let getJiraConfig: typeof import("@/server/lib/settings/jira").getJiraConfig;

function put(body: object) {
    return app.request("/settings/jira", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("admin Jira settings", () => {
    beforeEach(async () => {
        db.settings.clear();
        db.secrets.clear();
        authorizeMock.mockReset().mockResolvedValue({ type: "jwt" });

        // The encryption key file is created under the working directory, so point that at a scratch folder.
        workDir = fs.mkdtempSync(path.join(os.tmpdir(), "jira-settings-"));
        vi.spyOn(process, "cwd").mockReturnValue(workDir);

        // Re-imported per test so the settings caches and the key file path start fresh.
        vi.resetModules();
        const { settingsRouter } = await import("@/server/routes/admin/settings");
        ({ getJiraConfig } = await import("@/server/lib/settings/jira"));
        app = new OpenAPIHono().route("/settings", settingsRouter);
        app.onError(handleServerError);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        fs.rmSync(workDir, { recursive: true, force: true });
    });

    it("never sends the saved token back", async () => {
        await put({ token: TOKEN });

        const res = await app.request("/settings/jira");

        expect(res.status).toBe(200);
        const body = await res.text();
        expect(body).not.toContain(TOKEN);
        expect(JSON.parse(body).token).toEqual({ configured: true, source: "saved" });
    });

    it("stores the token encrypted", async () => {
        await put({ token: TOKEN });

        expect(db.secrets.get("JIRA_API_TOKEN")).toBeDefined();
        expect(db.secrets.get("JIRA_API_TOKEN")).not.toContain(TOKEN);
        expect((await getJiraConfig()).token).toBe(TOKEN);
    });

    it("keeps the saved token when a save leaves it out", async () => {
        await put({ baseUrl: "https://saved.example.com", token: TOKEN });

        await put({ project: "VR" });

        expect((await getJiraConfig()).token).toBe(TOKEN);
    });

    it("refuses a new url without the token, so the saved token cannot follow it", async () => {
        await put({ baseUrl: "https://saved.example.com", token: TOKEN });

        const res = await put({ baseUrl: "https://elsewhere.example.com" });

        expect(res.status).toBe(400);
        expect((await getJiraConfig()).baseUrl).toBe("https://saved.example.com");
    });

    it("drops every saved value on reset, so env applies again", async () => {
        await put({ baseUrl: "https://saved.example.com", token: TOKEN, project: "VR" });

        const res = await app.request("/settings/jira", { method: "DELETE" });

        expect(res.status).toBe(200);
        expect(await getJiraConfig()).toEqual({
            baseUrl: "https://env.example.com",
            token: undefined,
            project: undefined,
            assignee: undefined,
        });
    });

    it("refuses anyone but an admin", async () => {
        authorizeMock.mockRejectedValue(new ServerError("forbidden", 403));

        expect((await app.request("/settings/jira")).status).toBe(403);
        expect((await put({ token: TOKEN })).status).toBe(403);
        expect(db.secrets.size).toBe(0);
    });
});
