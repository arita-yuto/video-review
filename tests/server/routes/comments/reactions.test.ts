import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const authorizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/token", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/server/lib/token")>()),
    authorize: authorizeMock,
}));
vi.mock("@/server/lib/storage", () => ({ VideoReviewStorage: { deleteObject: vi.fn(async () => true) } }));

import { OpenAPIHono } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { handleServerError } from "@/server/lib/server-error";
import { commentsRouter } from "@/server/routes/comments";

const app = new OpenAPIHono().route("/", commentsRouter);
app.onError(handleServerError);

// The token's name differs from the User row, which is where userName comes from.
const viewer = (id: string) => ({
    type: "jwt" as const,
    decoded: { id, role: "viewer", provider: "password", displayName: "token name" },
});

type Caller = { type: "jwt"; decoded: { id: string; role: string } };

describe("comment reactions (DB)", () => {
    const videoId = randomUUID();
    const viewerA = viewer(randomUUID());
    const viewerB = viewer(randomUUID());
    const viewerAEmail = `${viewerA.decoded.id}@example.com`;
    let commentId: string;

    async function thumbsUp(caller: Caller, pressed: boolean) {
        authorizeMock.mockResolvedValue(caller);

        return app.request(`http://localhost/${commentId}/reactions/thumbsUp`, {
            method: pressed ? "PUT" : "DELETE",
        });
    }

    beforeAll(async () => {
        await prisma.user.createMany({
            data: [
                { id: viewerA.decoded.id, displayName: "Viewer A", email: viewerAEmail },
                { id: viewerB.decoded.id, displayName: "Viewer B" },
            ],
        });

        await prisma.video.create({
            data: {
                id: videoId,
                title: `DB Thumbs Up ${videoId.slice(0, 8)}`,
                folderKey: `db-tests-${videoId.slice(0, 8)}`,
                guestVisible: true,
            },
        });
    });

    beforeEach(async () => {
        commentId = randomUUID();

        await prisma.videoComment.create({
            data: {
                id: commentId,
                videoId,
                videoRevNum: 1,
                userId: "someone-else",
                userName: "thumbs-up-test",
                comment: "comment",
                time: 0,
                // The column is not read, so a value left in it must not show up in the count.
                thumbsUp: 2,
            },
        });
    });

    afterAll(async () => {
        await prisma.videoComment.deleteMany({ where: { videoId } });
        await prisma.video.deleteMany({ where: { id: videoId } });
        await prisma.user.deleteMany({ where: { id: { in: [viewerA.decoded.id, viewerB.decoded.id] } } });
    });

    it("counts one thumbs-up per person however many times they press", async () => {
        await thumbsUp(viewerA, true);
        const res = await thumbsUp(viewerA, true);

        expect(res.status).toBe(200);

        const body = await res.json();

        expect(body.thumbsUp).toBe(1);
        expect(body.reactions).toEqual([{ kind: "thumbsUp", userId: viewerA.decoded.id, userName: "Viewer A", userEmail: viewerAEmail }]);
    });

    it("taking back a thumbs-up removes only the caller's own", async () => {
        await thumbsUp(viewerA, true);
        await thumbsUp(viewerB, true);
        const res = await thumbsUp(viewerB, false);

        expect(res.status).toBe(200);

        const body = await res.json();

        expect(body.thumbsUp).toBe(1);
        expect(body.reactions).toEqual([{ kind: "thumbsUp", userId: viewerA.decoded.id, userName: "Viewer A", userEmail: viewerAEmail }]);
    });

    it("refuses a guest's thumbs-up", async () => {
        const res = await thumbsUp({ type: "jwt", decoded: { id: "guest-1", role: "guest" } }, true);

        expect(res.status).toBe(403);
        expect(await prisma.videoCommentReaction.count({ where: { commentId } })).toBe(0);
    });
});
