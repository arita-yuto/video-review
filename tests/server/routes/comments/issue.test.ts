import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServerError } from "@/server/lib/server-error";

// Prisma and the Jira HTTP API are both mocked: the test checks what the route
// sends to Jira and what it writes back to the comment, not the integrations themselves.
const prismaMock = vi.hoisted(() => ({
    videoComment: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    // Nothing saved from the admin screen, so the Jira values come from env.
    systemSetting: { findUnique: vi.fn().mockResolvedValue(null) },
    systemSecret: { findUnique: vi.fn().mockResolvedValue(null) },
}));

const envMock = vi.hoisted(() => ({
    JIRA_BASE_URL: "https://jira.example.com",
    JIRA_API_TOKEN: "jira-token",
    JIRA_PROJECT: "VR",
    JIRA_ASSIGNEE_USER: undefined as string | undefined,
}));

const authorizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/env", () => ({ env: envMock }));
vi.mock("@/server/lib/token", () => ({ authorize: authorizeMock }));

import { commentsRouter } from "@/server/routes/comments";

const COMMENT = {
    id: "comment-1",
    videoId: "video-1",
    comment: "The door clips through the wall",
    issueId: null,
};

type JiraCall = { url: string; init: RequestInit };

// Scripted Jira: the first call creates the issue, a second one (if any) attaches the file.
function stubJira(issueKey = "VR-42") {
    const calls: JiraCall[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        if (url.endsWith("/attachments")) {
            return { ok: true, json: async () => ({}) };
        }
        return { ok: true, json: async () => ({ key: issueKey }) };
    }));
    return calls;
}

function issueRequest(fields: Record<string, string> = {}, file?: File) {
    const form = new FormData();
    form.set("baseURL", "https://review.example.com");
    form.set("issueType", "Bug");
    form.set("reporterEmail", "reporter@example.com");
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    if (file) form.set("file", file);
    // Goes through the parent router because that is where the ":id" segment is mounted.
    return new Request("http://localhost/comment-1/issue", { method: "POST", body: form });
}

describe("POST /comments/:id/issue", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeMock.mockResolvedValue({ type: "jwt" });
        prismaMock.videoComment.findUnique.mockResolvedValue(COMMENT);
        prismaMock.videoComment.update.mockImplementation(async ({ data }) => ({ ...COMMENT, ...data }));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("creates the issue from the comment and links its key to the comment", async () => {
        const calls = stubJira("VR-42");

        const res = await commentsRouter.request(issueRequest());

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.issueId).toBe("VR-42");

        expect(calls).toHaveLength(1);
        expect(calls[0].url).toBe("https://jira.example.com/rest/api/2/issue");
        const fields = JSON.parse(calls[0].init.body as string).fields;
        expect(fields.project).toEqual({ key: "VR" });
        expect(fields.summary).toBe(COMMENT.comment);
        expect(fields.issuetype).toEqual({ name: "Bug" });
        expect(fields.reporter).toEqual({ name: "reporter@example.com" });
        expect(fields.description).toContain("https://review.example.com");
        expect(fields.description).toContain(COMMENT.videoId);
        expect(fields.description).toContain(COMMENT.id);

        expect(prismaMock.videoComment.update).toHaveBeenCalledTimes(1);
        expect(prismaMock.videoComment.update.mock.calls[0][0].data.issueId).toBe("VR-42");
    });

    it("attaches the screenshot only when one is sent", async () => {
        const calls = stubJira("VR-7");
        const file = new File([new Uint8Array([1, 2, 3])], "screenshot.png", { type: "image/png" });

        const res = await commentsRouter.request(issueRequest({}, file));

        expect(res.status).toBe(200);
        expect(calls).toHaveLength(2);
        expect(calls[1].url).toBe("https://jira.example.com/rest/api/2/issue/VR-7/attachments");
        expect(calls[1].init.body).toBeInstanceOf(FormData);
    });

    it("fails with 500 and never calls Jira when the configuration is incomplete", async () => {
        const calls = stubJira();
        const token = envMock.JIRA_API_TOKEN;
        envMock.JIRA_API_TOKEN = "";
        try {
            const res = await commentsRouter.request(issueRequest());

            expect(res.status).toBe(500);
            expect(calls).toHaveLength(0);
            expect(prismaMock.videoComment.update).not.toHaveBeenCalled();
        } finally {
            envMock.JIRA_API_TOKEN = token;
        }
    });

    it("returns 404 for an unknown comment", async () => {
        const calls = stubJira();
        prismaMock.videoComment.findUnique.mockResolvedValue(null);

        const res = await commentsRouter.request(issueRequest());

        expect(res.status).toBe(404);
        expect(calls).toHaveLength(0);
    });

    it("rejects unauthenticated requests before touching anything", async () => {
        const calls = stubJira();
        authorizeMock.mockRejectedValue(new ServerError("unauthorized", 401));

        const res = await commentsRouter.request(issueRequest());

        expect(res.status).toBe(401);
        expect(calls).toHaveLength(0);
        expect(prismaMock.videoComment.findUnique).not.toHaveBeenCalled();
    });
});
