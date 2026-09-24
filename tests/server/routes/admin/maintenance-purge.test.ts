import { beforeEach, describe, expect, it, vi } from "vitest";

// Prisma, storage and authorize are mocked: the test pins the rule that a video with no live
// revision stops being listed, not the database or the storage driver.
const prismaMock = vi.hoisted(() => {
    const tx = {
        $executeRaw: vi.fn(),
        videoRevision: { update: vi.fn(), findFirst: vi.fn() },
        video: { update: vi.fn() },
    };
    return {
        tx,
        videoRevision: { findUnique: vi.fn() },
        $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<void>) => fn(tx)),
    };
});

const authorizeMock = vi.hoisted(() => vi.fn());
const storageMock = vi.hoisted(() => ({ deleteObject: vi.fn() }));

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", () => ({
    authorize: authorizeMock,
    getJwtSecret: vi.fn(),
    getApiSecretHash: vi.fn(),
}));
vi.mock("@/server/lib/storage", () => ({ VideoReviewStorage: storageMock }));

import { maintenanceRouter } from "@/server/routes/admin/maintenance";

function purgeRequest(revision = 2) {
    return maintenanceRouter.request("http://localhost/video/purge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoId: "video-1", revision: String(revision) }),
    });
}

describe("POST /video/purge", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeMock.mockResolvedValue({ type: "jwt" });
        prismaMock.videoRevision.findUnique.mockResolvedValue({
            id: "rev-2",
            videoId: "video-1",
            revision: 2,
            filePath: "videos/cut010/rev_002.mp4",
        });
        storageMock.deleteObject.mockResolvedValue(true);
    });

    it("hides the video once its last live revision is purged", async () => {
        prismaMock.tx.videoRevision.findFirst.mockResolvedValue(null);

        const res = await purgeRequest();

        expect(res.status).toBe(200);
        expect(prismaMock.tx.video.update).toHaveBeenCalledWith({
            where: { id: "video-1" },
            data: { latestRevisionNum: null, deleted: true },
        });
    });

    it("repoints a video that still has an older revision, instead of hiding it", async () => {
        const uploadedAt = new Date("2026-01-02T03:04:05.000Z");
        prismaMock.tx.videoRevision.findFirst.mockResolvedValue({ revision: 1, uploadedAt });

        const res = await purgeRequest();

        expect(res.status).toBe(200);
        // Players follow latestRevisionNum, so leaving it on the purged revision breaks playback.
        // latestUpdatedAt denormalises the same revision, so it has to rewind with it.
        expect(prismaMock.tx.video.update).toHaveBeenCalledWith({
            where: { id: "video-1" },
            data: { latestRevisionNum: 1, latestUpdatedAt: uploadedAt },
        });
    });
});
