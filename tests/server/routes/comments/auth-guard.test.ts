import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerError } from "@/server/lib/server-error";

// The comment routes are guarded by authorize (the login gate). authorize lives
// in the same module we mock, so we replace it directly: it resolves when the
// caller is authenticated and throws a ServerError when the gate rejects.
const prismaMock = vi.hoisted(() => ({
    videoComment: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
    },
    videoCommentReaction: { findMany: vi.fn(async () => []) },
}));

const authorizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/server/lib/token")>()),
    authorize: authorizeMock,
}));

import { commentsRouter } from "@/server/routes/comments";

function createRequest() {
    return new Request("http://localhost/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            videoId: "video-1",
            videoRevNum: 1,
            userName: "reviewer",
            userEmail: "reviewer@example.com",
            comment: "looks off here",
            time: 12,
        }),
    });
}

function updateRequest() {
    return new Request("http://localhost/", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "comment-1", comment: "edited" }),
    });
}

describe("comments router login gate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects POST /comments before creating anything when the gate denies", async () => {
        authorizeMock.mockRejectedValue(new ServerError("unauthorized", 401));

        await commentsRouter.request(createRequest());

        // Mapping the thrown ServerError to a status is app.onError's job (tested separately);
        // here we only prove the guard blocked the DB write.
        expect(prismaMock.videoComment.create).not.toHaveBeenCalled();
    });

    it("rejects PATCH /comments before updating anything when the gate denies", async () => {
        authorizeMock.mockRejectedValue(new ServerError("unauthorized", 401));

        await commentsRouter.request(updateRequest());

        // Status mapping is app.onError's job (tested separately); assert the guard blocked the write.
        expect(prismaMock.videoComment.update).not.toHaveBeenCalled();
    });

    it("lets an authenticated GET /comments through to the handler", async () => {
        authorizeMock.mockResolvedValue({ type: "jwt", decoded: { id: "u", role: "viewer" } });
        prismaMock.videoComment.findMany.mockResolvedValue([]);

        const res = await commentsRouter.request("http://localhost/", { method: "GET" });

        expect(res.status).toBe(200);
        expect(prismaMock.videoComment.findMany).toHaveBeenCalledTimes(1);
    });
});
