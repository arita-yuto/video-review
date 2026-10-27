import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { handleServerError } from "@/server/lib/server-error";

// Prisma and Jira are mocked: the tests check how the route treats Jira's answers about a key, not Jira itself.
const prismaMock = vi.hoisted(() => ({
    videoComment: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
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

const COMMENT = {
    id: "comment-1",
    videoId: "video-1",
    userId: "user-1",
    comment: "The door clips through the wall",
    time: 72.4,
    userName: "Kita",
    issueId: "VR-9",
};

// Jira that has lost every issue: each call is a 404.
function stubJiraWithoutIssues() {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, json: async () => ({ errorMessages: ["Issue does not exist"] }) })));
}

function patch(body: object) {
    const app = new Hono().onError(handleServerError).route("/", commentsRouter);
    return app.request("http://localhost/", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "comment-1", ...body }),
    });
}

describe("PATCH /comments changing the issue key", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prismaMock.videoComment.findUnique.mockResolvedValue(COMMENT);
        prismaMock.videoComment.update.mockImplementation(async ({ data }) => ({ ...COMMENT, ...data }));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("refuses a key the tracker does not have, unless it is the key already on the comment", async () => {
        stubJiraWithoutIssues();

        const changed = await patch({ issueId: "VR-404" });
        expect(changed.status).toBe(400);
        expect(await changed.json()).toEqual({ error: "issue VR-404 was not found" });
        expect(prismaMock.videoComment.update).not.toHaveBeenCalled();

        const same = await patch({ issueId: "VR-9" });
        expect(same.status).toBe(200);
    });

    it("refuses a new key while the tracker cannot be reached, but still saves a text edit", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => {
            throw new Error("ECONNREFUSED");
        }));

        const changed = await patch({ issueId: "VR-10" });
        expect(changed.status).toBe(400);
        expect(await changed.json()).toEqual({ error: "issue VR-10 could not be checked: the issue tracker did not answer" });

        const textOnly = await patch({ comment: "The door clips through the wall, still", issueId: "VR-9" });
        expect(textOnly.status).toBe(200);
    });
});
