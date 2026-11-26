import { beforeEach, describe, expect, it, vi } from "vitest";

const OLD_PATH = "drawing/00000000-0000-4000-8000-000000000000.png";
const COMMENT_PATH = "drawing/comment-1.png";

const sessionKey = vi.hoisted(() => ({ value: "" }));
const deleteObjectMock = vi.hoisted(() => vi.fn(async () => true));
const deleteSessionMock = vi.hoisted(() => vi.fn(async () => {}));
const prismaMock = vi.hoisted(() => ({
    videoComment: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    videoCommentReaction: { findMany: vi.fn(async () => []) },
}));

vi.mock("@/server/lib/token", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/server/lib/token")>()),
    authorize: vi.fn(async () => ({ type: "api-token" as const, role: "admin" as const })),
}));
vi.mock("@/server/lib/upload-session", () => ({
    getSession: vi.fn(async () => ({ id: "session-1", storageKey: sessionKey.value })),
    deleteSession: deleteSessionMock,
}));
vi.mock("@/server/lib/storage", () => ({ VideoReviewStorage: { deleteObject: deleteObjectMock } }));
vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));

import { commentsRouter } from "@/server/routes/comments";

function finish() {
    return commentsRouter.request("http://localhost/comment-1/drawing/finish?session_id=session-1", { method: "POST" });
}

describe("comment drawing finish", () => {
    beforeEach(() => {
        deleteObjectMock.mockClear();
        deleteSessionMock.mockClear();
        prismaMock.videoComment.update.mockReset();
        prismaMock.videoComment.findUnique.mockResolvedValue({ id: "comment-1", drawingPath: OLD_PATH, hasDrawing: true, deleted: false });
    });

    it("refuses a session that was opened for another comment", async () => {
        sessionKey.value = "drawing/comment-2.png";

        const res = await finish();

        expect(res.status).toBe(400);
        expect(prismaMock.videoComment.update).not.toHaveBeenCalled();
        expect(deleteObjectMock).not.toHaveBeenCalled();
    });

    it("marks the drawing present and drops the file at the old place", async () => {
        sessionKey.value = COMMENT_PATH;
        prismaMock.videoComment.update.mockImplementation(async ({ data }: { data: object }) => ({ id: "comment-1", ...data }));

        const res = await finish();

        expect(res.status).toBe(200);
        expect(deleteObjectMock).toHaveBeenCalledWith(OLD_PATH);
        expect(prismaMock.videoComment.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ drawingPath: COMMENT_PATH, hasDrawing: true }),
        }));
        expect(deleteSessionMock).toHaveBeenCalledWith("session-1");
    });

    it("keeps the file when the comment already draws from its own place", async () => {
        sessionKey.value = COMMENT_PATH;
        prismaMock.videoComment.findUnique.mockResolvedValue({ id: "comment-1", drawingPath: COMMENT_PATH, hasDrawing: true, deleted: false });
        prismaMock.videoComment.update.mockImplementation(async ({ data }: { data: object }) => ({ id: "comment-1", ...data }));

        const res = await finish();

        expect(res.status).toBe(200);
        expect(deleteObjectMock).not.toHaveBeenCalled();
        expect(prismaMock.videoComment.update).toHaveBeenCalledTimes(1);
    });
});
