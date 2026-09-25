import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { OpenAPIHono } from "@hono/zod-openapi";

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
let ServerError: typeof import("@/server/lib/server-error").ServerError;
let workDir: string;
let getJiraConfig: typeof import("@/server/lib/integrations/jira").getJiraConfig;

function testAndSave(body: object) {
    return app.request("/settings/jira/test-and-save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

function put(body: object) {
    return app.request("/settings/jira", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

// Jira stands in for every integration: the rules live in the shared store and router.
describe("admin integration settings (via Jira)", () => {
    beforeEach(async () => {
        db.settings.clear();
        db.secrets.clear();
        envMock.JIRA_API_TOKEN = undefined;
        authorizeMock.mockReset().mockResolvedValue({ type: "jwt" });

        // The encryption key file is created under the working directory, so point that at a scratch folder.
        workDir = fs.mkdtempSync(path.join(os.tmpdir(), "jira-settings-"));
        vi.spyOn(process, "cwd").mockReturnValue(workDir);

        // Re-imported per test so the settings caches and the key file path start fresh.
        vi.resetModules();
        const { settingsRouter } = await import("@/server/routes/admin/settings");
        // Taken from the same fresh module graph, so the error handler recognises the errors the routes throw.
        const serverError = await import("@/server/lib/server-error");
        ServerError = serverError.ServerError;
        ({ getJiraConfig } = await import("@/server/lib/integrations/jira"));
        app = new OpenAPIHono().route("/settings", settingsRouter);
        app.onError(serverError.handleServerError);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        fs.rmSync(workDir, { recursive: true, force: true });
    });

    it("never sends the saved token back", async () => {
        await put({ token: TOKEN });

        const res = await app.request("/settings/jira");

        expect(res.status).toBe(200);
        const body = await res.text();
        expect(body).not.toContain(TOKEN);
        expect(JSON.parse(body).token).toEqual({ kind: "secret", configured: true, source: "saved" });
    });

    it("stores the token encrypted", async () => {
        await put({ token: TOKEN });

        expect(db.secrets.get("jira.token")).toBeDefined();
        expect(db.secrets.get("jira.token")).not.toContain(TOKEN);
        expect((await getJiraConfig()).token).toBe(TOKEN);
    });

    it("keeps the saved token when a save leaves it out", async () => {
        await put({ baseUrl: "https://saved.example.com", token: TOKEN });

        const res = await put({ project: "VR" });

        expect(res.status).toBe(200);
        expect(await getJiraConfig()).toMatchObject({ token: TOKEN, project: "VR" });
    });

    it("locks the url while a token is saved, even when a token comes with it", async () => {
        await put({ baseUrl: "https://saved.example.com", token: TOKEN });

        const res = await put({ baseUrl: "https://elsewhere.example.com", token: "another-token" });

        expect(res.status).toBe(400);
        expect((await getJiraConfig()).baseUrl).toBe("https://saved.example.com");
    });

    it("clears only the saved token on reset, and never falls back to the env token for the saved url", async () => {
        envMock.JIRA_API_TOKEN = "env-token";
        await put({ baseUrl: "https://saved.example.com", token: TOKEN, project: "VR" });

        const res = await app.request("/settings/jira", { method: "DELETE" });

        expect(res.status).toBe(200);
        expect(await getJiraConfig()).toMatchObject({ baseUrl: "https://saved.example.com", token: undefined, project: "VR" });
    });

    it("refuses anyone but an admin", async () => {
        authorizeMock.mockRejectedValue(new ServerError("forbidden", 403));

        expect((await app.request("/settings/jira")).status).toBe(403);
        expect((await put({ token: TOKEN })).status).toBe(403);
        expect(db.secrets.size).toBe(0);
    });

    it("saves nothing when the test fails", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("unreachable"); }));

        const res = await testAndSave({ baseUrl: "https://new.example.com", token: TOKEN, project: "VR" });

        expect((await res.json()).result.ok).toBe(false);
        expect(db.settings.size).toBe(0);
        expect(db.secrets.size).toBe(0);
    });

    it("tests the entered values, then saves them once the test passes", async () => {
        const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ issueTypes: [{ name: "Task" }] }) }));
        vi.stubGlobal("fetch", fetchMock);

        const res = await testAndSave({ baseUrl: "https://new.example.com", token: TOKEN, project: "VR", issueTypeTask: "Task" });

        expect((await res.json()).result.ok).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://new.example.com/rest/api/2/project/VR",
            expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }) }),
        );
        expect(await getJiraConfig()).toMatchObject({
            baseUrl: "https://new.example.com",
            token: TOKEN,
            project: "VR",
            issueTypeTask: "Task",
        });
    });

    it("never sends the env token to a url sent in Test & save", async () => {
        envMock.JIRA_API_TOKEN = "env-token";
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const res = await testAndSave({ baseUrl: "https://attacker.example", project: "VR" });

        expect((await res.json()).result.ok).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
