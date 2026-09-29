import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/lib/db";
import { ServerError } from "@/server/lib/server-error";

const mocks = vi.hoisted(() => ({
    download: vi.fn(),
}));

vi.mock("@/server/lib/token", () => ({
    authorize: vi.fn(),
}));

vi.mock("@/server/lib/storage", () => ({
    VideoReviewStorage: {
        download: mocks.download,
    },
}));

import { authorize } from "@/server/lib/token";
import { downloadRouter } from "@/server/routes/media/download";

describe("media downloadRouter (DB)", () => {
    const videoId = randomUUID();
    const revisionIds: string[] = [];

    async function createRevision(revision: number, deleted: boolean) {
        const id = randomUUID();
        await prisma.videoRevision.create({
            data: {
                id,
                videoId,
                revision,
                filePath: `videos/test/${videoId}-rev${revision}.mp4`,
                deleted,
            },
        });
        revisionIds.push(id);
    }

    beforeAll(async () => {
        await prisma.video.create({
            data: { id: videoId, title: `Download Test ${videoId.slice(0, 8)}`, folderKey: "download-tests" },
        });
        await createRevision(1, false);
        await createRevision(2, false);
        await createRevision(3, true);
    });

    afterAll(async () => {
        await prisma.videoRevision.deleteMany({ where: { id: { in: revisionIds } } });
        await prisma.video.delete({ where: { id: videoId } });
    });

    it("serves the latest non-deleted revision when videoRevId is omitted", async () => {
        vi.mocked(authorize).mockResolvedValueOnce({ type: "api-token", role: "admin" });
        mocks.download.mockResolvedValueOnce(new Response("video-bytes"));

        const res = await downloadRouter.request(`http://localhost/?videoId=${videoId}`, { method: "GET" });

        expect(res.status).toBe(200);
        expect(mocks.download).toHaveBeenCalledWith(`videos/test/${videoId}-rev2.mp4`);
    });

    it("does not let guests download", async () => {
        vi.mocked(authorize).mockRejectedValueOnce(new ServerError("forbidden", 403));
        mocks.download.mockClear();

        const res = await downloadRouter.request(`http://localhost/?videoId=${videoId}`, { method: "GET" });

        expect(res.status).toBe(403);
        expect(mocks.download).not.toHaveBeenCalled();
        expect(vi.mocked(authorize).mock.lastCall?.[1]).not.toContain("guest");
    });
});
