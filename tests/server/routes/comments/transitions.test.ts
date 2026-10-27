import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { handleServerError } from "@/server/lib/server-error";

const prismaMock = vi.hoisted(() => ({
    videoComment: { findUnique: vi.fn() },
    systemSetting: { findUnique: vi.fn().mockResolvedValue(null) },
    systemSecret: { findUnique: vi.fn().mockResolvedValue(null) },
}));

const envMock = vi.hoisted(() => ({
    JIRA_BASE_URL: "https://jira.example.com",
    JIRA_API_TOKEN: "jira-token",
    JIRA_PROJECT: "VR",
}));

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/env", () => ({ env: envMock }));
vi.mock("@/server/lib/token", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/server/lib/token")>()),
    authorize: vi.fn(async () => ({ type: "api-token", role: "admin" })),
}));

import { commentsRouter } from "@/server/routes/comments";

describe("POST /comments/:id/transitions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prismaMock.videoComment.findUnique.mockResolvedValue({ id: "comment-1", videoId: "video-1", issueId: "VR-9" });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    // The app hides 5xx messages, so Jira's reason only reaches the screen as a 4xx.
    it("passes Jira's refusal on with its message", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: false,
            status: 400,
            json: async () => ({ errorMessages: ["Transition id '41' is not valid for this issue."] }),
        })));
        const app = new Hono().onError(handleServerError).route("/", commentsRouter);

        const res = await app.request("http://localhost/comment-1/transitions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ transitionId: "41" }),
        });

        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: "Transition id '41' is not valid for this issue." });
    });
});
