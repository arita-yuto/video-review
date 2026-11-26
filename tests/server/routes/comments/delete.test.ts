import { beforeEach, describe, expect, it, vi } from "vitest";

const DRAWING_PATH = "drawing/comment-1.png";

const deleteObjectMock = vi.hoisted(() => vi.fn(async () => true));
const prismaMock = vi.hoisted(() => ({
    videoComment: {
        findUnique: vi.fn(async () => ({ userId: "u", videoId: "video-1" })),
        update: vi.fn(),
    },
    videoCommentReaction: { findMany: vi.fn(async () => []) },
}));

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/server/lib/token")>()),
    authorize: vi.fn(async () => ({ type: "jwt", decoded: { id: "u", role: "viewer" } })),
}));
vi.mock("@/server/lib/storage", () => ({ VideoReviewStorage: { deleteObject: deleteObjectMock } }));

import { commentsRouter } from "@/server/routes/comments";

function patch(body: object) {
    return commentsRouter.request("http://localhost/", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "comment-1", ...body }),
    });
}

describe("comments PATCH delete", () => {
    beforeEach(() => {
        deleteObjectMock.mockClear();
        prismaMock.videoComment.update.mockReset();
        prismaMock.videoComment.update.mockImplementation(async ({ data }: { data: object }) => ({ id: "comment-1", drawingPath: DRAWING_PATH, ...data }));
    });

    it("drops the drawing file when the comment is deleted", async () => {
        const res = await patch({ deleted: true });

        expect(res.status).toBe(200);
        expect(prismaMock.videoComment.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ deleted: true, hasDrawing: false }),
        }));
        expect(deleteObjectMock).toHaveBeenCalledWith(DRAWING_PATH);
    });
});
