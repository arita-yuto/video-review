import { describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";

vi.mock("@/server/lib/env", () => ({ env: { BUILD_VERSION: "v0.13.0" } }));

describe("GET /version", () => {
    it("returns the build's version without a token", async () => {
        const { versionRouter } = await import("@/server/routes/version");
        const app = new OpenAPIHono().route("/version", versionRouter);

        const res = await app.request("/version");

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ version: "v0.13.0" });
    });
});
