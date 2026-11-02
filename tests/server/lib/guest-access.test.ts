import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerError } from "@/server/lib/server-error";

const prismaMock = vi.hoisted(() => ({
    videoRevision: { findFirst: vi.fn() },
    videoComment: { findFirst: vi.fn() },
    video: { findUnique: vi.fn() },
}));

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));

import { videoIdForStorageKey, assertRoleCanSeeVideo } from "@/server/lib/videos/guest-access";

describe("videoIdForStorageKey", () => {
    beforeEach(() => {
        prismaMock.videoRevision.findFirst.mockReset();
        prismaMock.videoComment.findFirst.mockReset();
    });

    it("reads the videoId from a thumbnail key without a lookup", async () => {
        await expect(videoIdForStorageKey("thumbnails/vid-1/thumb.png")).resolves.toBe("vid-1");
        expect(prismaMock.videoRevision.findFirst).not.toHaveBeenCalled();
    });

    it("matches a resolution variant key against the base revision filePath", async () => {
        prismaMock.videoRevision.findFirst.mockResolvedValue({ videoId: "vid-2" });
        await expect(videoIdForStorageKey("videos/x/rev_001_480p.mp4")).resolves.toBe("vid-2");
        expect(prismaMock.videoRevision.findFirst).toHaveBeenCalledWith({
            where: { filePath: { in: ["videos/x/rev_001.mp4", "videos/x/rev_001_480p.mp4"] } },
            select: { videoId: true },
        });
    });

    it("matches a filmstrip sheet key against the revision filePath with any extension", async () => {
        prismaMock.videoRevision.findFirst.mockResolvedValue({ videoId: "vid-3" });
        await expect(videoIdForStorageKey("videos/x/rev_001_strip_002.jpg")).resolves.toBe("vid-3");
        expect(prismaMock.videoRevision.findFirst).toHaveBeenCalledWith({
            where: { filePath: { startsWith: "videos/x/rev_001." } },
            select: { videoId: true },
        });
    });

    it("reaches a drawing's video through the comment", async () => {
        prismaMock.videoRevision.findFirst.mockResolvedValue(null);
        prismaMock.videoComment.findFirst.mockResolvedValue({ videoId: "vid-4" });
        await expect(videoIdForStorageKey("drawing/abc.png")).resolves.toBe("vid-4");
        expect(prismaMock.videoComment.findFirst).toHaveBeenCalledWith({
            where: { drawingPath: "drawing/abc.png" },
            select: { videoId: true },
        });
    });

    it("returns null when nothing matches", async () => {
        prismaMock.videoRevision.findFirst.mockResolvedValue(null);
        prismaMock.videoComment.findFirst.mockResolvedValue(null);
        await expect(videoIdForStorageKey("videos/unknown/none.mp4")).resolves.toBeNull();
    });
});

describe("assertRoleCanSeeVideo", () => {
    beforeEach(() => {
        prismaMock.video.findUnique.mockReset();
    });

    it("lets viewers and admins through without a lookup", async () => {
        await expect(assertRoleCanSeeVideo("vid-1", "viewer")).resolves.toBeUndefined();
        await expect(assertRoleCanSeeVideo("vid-1", "admin")).resolves.toBeUndefined();
        expect(prismaMock.video.findUnique).not.toHaveBeenCalled();
    });

    it("allows a guest on a guest-visible video", async () => {
        prismaMock.video.findUnique.mockResolvedValue({ guestVisible: true });
        await expect(assertRoleCanSeeVideo("vid-1", "guest")).resolves.toBeUndefined();
    });

    it("forbids a guest on a non-visible or missing video", async () => {
        prismaMock.video.findUnique.mockResolvedValue({ guestVisible: false });
        await expect(assertRoleCanSeeVideo("vid-1", "guest")).rejects.toBeInstanceOf(ServerError);

        prismaMock.video.findUnique.mockResolvedValue(null);
        await expect(assertRoleCanSeeVideo("vid-1", "guest")).rejects.toBeInstanceOf(ServerError);
    });
});
