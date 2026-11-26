import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
    videoComment: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
    },
    video: {
        findUnique: vi.fn(async () => ({ guestVisible: true })),
    },
    videoCommentReaction: {
        findMany: vi.fn(async () => []),
    },
}));
const authorizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/server/lib/token")>()),
    authorize: authorizeMock,
}));
vi.mock("@/server/lib/storage", () => ({ VideoReviewStorage: { deleteObject: vi.fn(async () => true) } }));

import { OpenAPIHono } from "@hono/zod-openapi";
import { handleServerError } from "@/server/lib/server-error";
import { commentsRouter } from "@/server/routes/comments";

// The 403 is a thrown ServerError, which the app's error handler turns into a response.
const app = new OpenAPIHono().route("/", commentsRouter);
app.onError(handleServerError);

const viewer = (id: string) => ({ type: "jwt" as const, decoded: { id, role: "viewer" } });

function patch(body: object) {
    return app.request("http://localhost/", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "comment-1", ...body }),
    });
}

describe("comment author", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prismaMock.videoComment.findUnique.mockResolvedValue({ id: "comment-1", videoId: "video-1", userId: "author" });
        prismaMock.videoComment.update.mockImplementation(async ({ data }: { data: object }) => ({ id: "comment-1", ...data }));
        prismaMock.videoComment.create.mockImplementation(async ({ data }: { data: object }) => data);
    });

    it("refuses to delete someone else's comment", async () => {
        authorizeMock.mockResolvedValue(viewer("someone-else"));

        const res = await patch({ deleted: true });

        expect(res.status).toBe(403);
        expect(prismaMock.videoComment.update).not.toHaveBeenCalled();
    });

    it("lets anyone record a notification on a comment", async () => {
        authorizeMock.mockResolvedValue(viewer("someone-else"));

        const res = await patch({ notifiedProviders: ["slack"] });

        expect(res.status).toBe(200);
        expect(prismaMock.videoComment.update).toHaveBeenCalledTimes(1);
    });

    it("records the caller as the author of a new comment", async () => {
        authorizeMock.mockResolvedValue({ type: "jwt", decoded: { id: "guest-1", role: "guest" } });

        const res = await app.request("http://localhost/", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ videoId: "video-1", videoRevNum: 1, userName: "visitor", userEmail: "", comment: "hi", time: 1 }),
        });

        expect(res.status).toBe(201);
        expect(prismaMock.videoComment.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ userId: "guest-1", isGuest: true }),
        }));
    });
});
