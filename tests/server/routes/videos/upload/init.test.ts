import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/lib/db";

const mocks = vi.hoisted(() => ({
    createSession: vi.fn(),
    storageType: vi.fn(),
    uploadURL: vi.fn(),
}));

vi.mock("@/server/lib/token", () => ({
    authorize: vi.fn(),
}));

vi.mock("@/server/lib/upload-session", () => ({
    createSession: mocks.createSession,
}));

vi.mock("@/server/lib/storage", () => ({
    VideoReviewStorage: {
        type: mocks.storageType,
        uploadURL: mocks.uploadURL,
    },
}));

import { authorize } from "@/server/lib/token";
import { initRouter } from "@/server/routes/videos/upload/init";

const createdVideoIds: string[] = [];

function multipartBody(fields: Record<string, string>) {
    const boundary = `----video-review-${randomUUID()}`;
    const parts = Object.entries(fields)
        .map(
            ([key, value]) =>
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
                `${value}\r\n`,
        )
        .join("");
    const body = `${parts}--${boundary}--\r\n`;
    return {
        body,
        contentType: `multipart/form-data; boundary=${boundary}`,
    };
}

describe("videos upload initRouter (DB)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.storageType.mockReturnValue("local");
        mocks.uploadURL.mockResolvedValue("https://example.test/upload");
    });

    afterAll(async () => {
        if (createdVideoIds.length === 0) return;
        await prisma.video.updateMany({
            where: { id: { in: createdVideoIds } },
            data: { latestRevisionNum: null },
        });
        await prisma.videoRevision.deleteMany({
            where: { videoId: { in: createdVideoIds } },
        });
        await prisma.video.deleteMany({
            where: { id: { in: createdVideoIds } },
        });
    });

    it("returns 401 when authorization fails", async () => {
        vi.mocked(authorize).mockRejectedValueOnce(new Error("unauthorized"));

        const res = await initRouter.request("http://localhost/", {
            method: "POST",
        });

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toEqual({ error: "unauthorized" });
    });

    it("returns 400 when required multipart fields are missing", async () => {
        vi.mocked(authorize).mockResolvedValueOnce({ type: "api-token", role: "admin" });

        const { body, contentType } = multipartBody({
            title: "missing-folder-key",
        });

        const res = await initRouter.request("http://localhost/", {
            method: "POST",
            headers: { "content-type": contentType },
            body,
        });

        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({ error: "missing parameter" });
    });

    it("creates draft video and returns upload URL for new title/folder", async () => {
        vi.mocked(authorize).mockResolvedValueOnce({ type: "api-token", role: "admin" });

        const title = `init-title-${randomUUID().slice(0, 8)}`;
        const folderKey = `init-folder-${randomUUID().slice(0, 8)}`;
        const scenePath = "videos/scenes/scene-01.mp4";

        mocks.createSession.mockImplementationOnce(async ({ storageKey }: { storageKey: string }) => ({
            id: "session-init-new",
            title,
            folderKey,
            scenePath,
            nextRev: 1,
            storage: "local",
            storageKey,
        }));

        const { body, contentType } = multipartBody({
            title,
            folderKey,
            scenePath,
        });

        const res = await initRouter.request("http://localhost/", {
            method: "POST",
            headers: { "content-type": contentType },
            body,
        });

        expect(res.status).toBe(200);

        const video = await prisma.video.findFirst({
            where: { title, folderKey },
            select: { id: true, deleted: true, latestRevisionNum: true, scenePath: true },
        });
        expect(video).not.toBeNull();
        createdVideoIds.push(video!.id);
        // The file goes under the video id, so renaming the video later leaves its path alone.
        const expectedStorageKey = `videos/${video!.id}/rev_001.mp4`;

        await expect(res.json()).resolves.toEqual({
            url: "https://example.test/upload",
            session: {
                id: "session-init-new",
                title,
                folderKey,
                scenePath,
                nextRev: 1,
                storage: "local",
                storageKey: expectedStorageKey,
            },
            // The clients do not carry an upload size of their own; the server states it.
            chunkSize: 16 * 1024 * 1024,
        });

        expect(video).toEqual({
            id: video!.id,
            deleted: true,
            latestRevisionNum: null,
            scenePath,
        });

        expect(mocks.createSession).toHaveBeenCalledWith({
            nextRev: 1,
            title,
            folderKey,
            scenePath,
            vcsWatchPaths: [],
            storageKey: expectedStorageKey,
            storage: "local",
        });
        expect(mocks.uploadURL).toHaveBeenCalledWith(
            "session-init-new",
            expectedStorageKey,
            "video/mp4",
        );
    });

    it("passes vcsWatchPaths from multipart field to createSession", async () => {
        vi.mocked(authorize).mockResolvedValueOnce({ type: "api-token", role: "admin" });

        const title = `init-title-${randomUUID().slice(0, 8)}`;
        const folderKey = `init-folder-${randomUUID().slice(0, 8)}`;

        mocks.createSession.mockImplementationOnce(async ({ storageKey }: { storageKey: string }) => ({
            id: "session-init-vcs",
            title,
            folderKey,
            scenePath: undefined,
            nextRev: 1,
            storage: "local",
            storageKey,
        }));

        const { body, contentType } = multipartBody({
            title,
            folderKey,
            vcsWatchPaths: "Assets/Scenes/Opening, Assets/Scripts/Camera/",
        });

        const res = await initRouter.request("http://localhost/", {
            method: "POST",
            headers: { "content-type": contentType },
            body,
        });

        expect(res.status).toBe(200);

        expect(mocks.createSession).toHaveBeenCalledWith(
            expect.objectContaining({
                vcsWatchPaths: ["Assets/Scenes/Opening", "Assets/Scripts/Camera/"],
            }),
        );

        const video = await prisma.video.findFirst({ where: { title, folderKey }, select: { id: true, vcsWatchPaths: true } });
        expect(video?.vcsWatchPaths).toEqual(["Assets/Scenes/Opening", "Assets/Scripts/Camera/"]);
        if (video) createdVideoIds.push(video.id);
    });
});
