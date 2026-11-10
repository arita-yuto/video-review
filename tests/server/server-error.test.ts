import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { handleServerError, ServerError } from "@/server/lib/server-error";

// Drives the real handleServerError the app installs, so it can't drift from production.
function buildApp() {
    const child = createRouter();
    child.get("/forbidden", () => { throw new ServerError("forbidden", 403); });
    child.get("/server-fault", () => { throw new ServerError("failed to create jira issue", 500); });
    child.get("/plain-error", () => { throw new Error("boom"); });

    const app = new OpenAPIHono().basePath("/api").route("/v1", child);
    app.onError(handleServerError);
    return app;
}

describe("handleServerError", () => {
    let consoleError: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleError.mockRestore();
    });

    it("returns a 4xx ServerError's status and message", async () => {
        const res = await buildApp().request("http://localhost/api/v1/forbidden");
        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({ error: "forbidden" });
        expect(consoleError).not.toHaveBeenCalled();
    });

    it("returns a 5xx ServerError's status and message", async () => {
        const res = await buildApp().request("http://localhost/api/v1/server-fault");
        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: "failed to create jira issue" });
        expect(consoleError).toHaveBeenCalledOnce();
    });

    it("hides any other error's message behind a 500", async () => {
        const res = await buildApp().request("http://localhost/api/v1/plain-error");
        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({ error: "internal error" });
        expect(consoleError).toHaveBeenCalledOnce();
    });
});
