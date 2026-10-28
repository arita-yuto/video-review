import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
    videoComment: { findMany: vi.fn() },
    video: { findUnique: vi.fn().mockResolvedValue({ guestVisible: true }) },
    systemSetting: { findUnique: vi.fn().mockResolvedValue(null) },
    systemSecret: { findUnique: vi.fn().mockResolvedValue(null) },
}));

const envMock = vi.hoisted(() => ({
    JIRA_BASE_URL: "https://jira.example.com",
    JIRA_API_TOKEN: "jira-token",
    JIRA_PROJECT: "VR",
}));

const authorizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/env", () => ({ env: envMock }));
vi.mock("@/server/lib/token", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/server/lib/token")>()),
    authorize: authorizeMock,
}));

import { videoByIdRouter } from "@/server/routes/videos/[id]";

const JIRA_ISSUE = { key: "VR-9", fields: { summary: "Door clips through the wall", status: { name: "To Do", statusCategory: { key: "new" } } } };

describe("GET /videos/:id/issue-status", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeMock.mockResolvedValue({ type: "api-token", role: "admin" });
        prismaMock.videoComment.findMany.mockResolvedValue([{ issueId: "VR-9" }]);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("answers with no statuses when the tracker cannot be reached, so the comment panel still loads", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => {
            throw new Error("ECONNREFUSED");
        }));

        const res = await videoByIdRouter.request("http://localhost/issue-status");

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({});
    });

    // The title may have been written in the tracker for the team only; a share-link viewer gets the status alone.
    it("leaves the issue title out for a guest", async () => {
        authorizeMock.mockResolvedValue({ type: "jwt", decoded: { role: "guest" } });
        vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => JIRA_ISSUE })));

        const res = await videoByIdRouter.request("http://localhost/issue-status");

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ "VR-9": { key: "VR-9", summary: "", status: { name: "To Do", category: "new" } } });
    });
});
