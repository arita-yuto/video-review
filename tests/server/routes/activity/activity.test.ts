import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const authorizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/token", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/server/lib/token")>()),
    authorize: authorizeMock,
}));

import { OpenAPIHono } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { handleServerError } from "@/server/lib/server-error";
import { activityRouter } from "@/server/routes/activity";

const app = new OpenAPIHono().route("/", activityRouter);
app.onError(handleServerError);

const viewer = (id: string) => ({ type: "jwt" as const, decoded: { id, role: "viewer" as const } });

type Entry = { kind: string; id: string; video: { id: string } };

type Page = { entries: Entry[]; nextCursor: string | null; seenAt: string | null };

// Every row of this file is older than this, which keeps the seeded rows out of its pages.
const BEFORE_ALL_OTHER_ROWS = "2001-12-31T00:00:00.000Z";

async function list(query: string): Promise<Page> {
    const res = await app.request(`http://localhost/?${query}`);

    expect(res.status).toBe(200);

    return res.json();
}

async function listEveryPage(): Promise<Page[]> {
    const pages = [await list(`before=${BEFORE_ALL_OTHER_ROWS}`)];

    while (pages[pages.length - 1].nextCursor !== null) {
        pages.push(await list(`before=${pages[pages.length - 1].nextCursor}`));
    }

    return pages;
}

// Other test files create rows in the same database while this one runs.
function keysOfVideos(pages: Page[], videoIds: string[]) {
    return pages
        .flatMap((page) => page.entries)
        .filter((entry) => videoIds.includes(entry.video.id))
        .map((entry) => `${entry.kind}:${entry.id}`);
}

describe("activity list (DB)", () => {
    const userId = randomUUID();
    const videoIds: string[] = [];

    async function createVideo(deleted: boolean) {
        const id = randomUUID();
        videoIds.push(id);

        await prisma.video.create({
            data: { id, title: `DB Activity ${id.slice(0, 8)}`, folderKey: `db-tests-${id.slice(0, 8)}`, deleted },
        });

        return id;
    }

    function commentData(videoId: string, createdAt: Date, deleted = false) {
        return {
            id: randomUUID(),
            videoId,
            videoRevNum: 1,
            userId: "someone",
            userName: "activity-test",
            comment: "comment",
            time: 0,
            createdAt,
            deleted,
        };
    }

    function revisionData(videoId: string, revision: number, uploadedAt: Date, deleted = false) {
        return { id: randomUUID(), videoId, revision, filePath: `activity-test/${revision}.mp4`, uploadedAt, deleted };
    }

    function reactionData(commentId: string, createdAt: Date) {
        return { id: randomUUID(), commentId, userId: randomUUID(), userName: "activity-test", kind: "thumbsUp", createdAt };
    }

    afterEach(async () => {
        await prisma.videoComment.deleteMany({ where: { videoId: { in: videoIds } } });
        await prisma.videoRevision.deleteMany({ where: { videoId: { in: videoIds } } });
        await prisma.video.deleteMany({ where: { id: { in: videoIds } } });
    });

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { id: userId } });
    });

    it("leaves out deleted comments, uploads of deleted revisions, anything on a deleted video, and thumbs-up on deleted comments", async () => {
        authorizeMock.mockResolvedValue(viewer(randomUUID()));

        const at = (minute: number) => new Date(Date.UTC(2001, 0, 1, 0, minute));
        const liveVideoId = await createVideo(false);
        const deletedVideoId = await createVideo(true);

        const liveComment = commentData(liveVideoId, at(1));
        const deletedComment = commentData(liveVideoId, at(2), true);
        const commentOnDeletedVideo = commentData(deletedVideoId, at(3));

        const liveRevision = revisionData(liveVideoId, 1, at(4));
        const deletedRevision = revisionData(liveVideoId, 2, at(5), true);
        const revisionOnDeletedVideo = revisionData(deletedVideoId, 1, at(6));

        const liveReaction = reactionData(liveComment.id, at(7));
        const reactionOnDeletedComment = reactionData(deletedComment.id, at(8));
        const reactionOnDeletedVideo = reactionData(commentOnDeletedVideo.id, at(9));

        await prisma.videoComment.createMany({ data: [liveComment, deletedComment, commentOnDeletedVideo] });
        await prisma.videoRevision.createMany({ data: [liveRevision, deletedRevision, revisionOnDeletedVideo] });
        await prisma.videoCommentReaction.createMany({ data: [liveReaction, reactionOnDeletedComment, reactionOnDeletedVideo] });

        const pages = await listEveryPage();

        expect(keysOfVideos(pages, [liveVideoId, deletedVideoId]).sort()).toEqual([
            `comment:${liveComment.id}`,
            `reaction:${liveReaction.id}`,
            `upload:${liveRevision.id}`,
        ]);
    });

    it("pages through mixed kinds newest first without skipping or repeating an entry", async () => {
        authorizeMock.mockResolvedValue(viewer(randomUUID()));

        const ROWS_PER_KIND = 20;
        const at = (minute: number) => new Date(Date.UTC(2001, 0, 1, 0, minute));
        const videoId = await createVideo(false);

        const comments = Array.from({ length: ROWS_PER_KIND }, (_, index) => commentData(videoId, at(index * 3)));
        const revisions = Array.from({ length: ROWS_PER_KIND }, (_, index) => revisionData(videoId, index + 1, at(index * 3 + 1)));
        const reactions = Array.from({ length: ROWS_PER_KIND }, (_, index) => reactionData(comments[0].id, at(index * 3 + 2)));

        await prisma.videoComment.createMany({ data: comments });
        await prisma.videoRevision.createMany({ data: revisions });
        await prisma.videoCommentReaction.createMany({ data: reactions });

        const newestFirst = [
            ...comments.map((comment) => ({ key: `comment:${comment.id}`, occurredAt: comment.createdAt })),
            ...revisions.map((revision) => ({ key: `upload:${revision.id}`, occurredAt: revision.uploadedAt })),
            ...reactions.map((reaction) => ({ key: `reaction:${reaction.id}`, occurredAt: reaction.createdAt })),
        ]
            .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
            .map((row) => row.key);

        const ENTRY_LIMIT = 50;

        const pages = await listEveryPage();

        expect(pages.length).toBeGreaterThan(1);

        for (const page of pages) {
            expect(page.entries.length).toBeLessThanOrEqual(ENTRY_LIMIT);
        }

        expect(keysOfVideos(pages, [videoId])).toEqual(newestFirst);
    });

    it("keeps the later seen time when an earlier one arrives afterwards", async () => {
        authorizeMock.mockResolvedValue(viewer(userId));

        const LATER = "2001-06-01T00:00:00.000Z";
        const EARLIER = "2001-01-01T00:00:00.000Z";

        await prisma.user.create({ data: { id: userId, displayName: "Activity Seen" } });

        for (const seenAt of [LATER, EARLIER]) {
            const res = await app.request("http://localhost/seen", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ seenAt }),
            });

            expect(res.status).toBe(200);
        }

        const page = await list(`kind=reaction&before=${BEFORE_ALL_OTHER_ROWS}`);

        expect(page.seenAt).toBe(LATER);
    });
});
