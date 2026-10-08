import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/lib/db";
import { foldersRouter } from "@/server/routes/videos/folders";

vi.mock("@/server/lib/token", async (importOriginal) => {
    const { withAuthorizePass } = await import("../../../mocks/authorize");
    return withAuthorizePass(await importOriginal<typeof import("@/server/lib/token")>());
});

const createdVideoIds: string[] = [];

async function createVideo(folderKey: string, title: string) {
    const id = randomUUID();
    await prisma.video.create({
        data: {
            id,
            title,
            folderKey,
            deleted: false,
        },
    });
    createdVideoIds.push(id);
}

describe("videos foldersRouter (DB)", () => {
    const unique = randomUUID().slice(0, 8);
    const keyA = `folder-a-${unique}`;
    const keyB = `folder-b-${unique}`;

    beforeAll(async () => {
        await createVideo(keyB, `Video B1 ${unique}`);
        await createVideo(keyA, `Video A1 ${unique}`);
        await createVideo(keyA, `Video A2 ${unique}`);
    });

    afterAll(async () => {
        if (createdVideoIds.length === 0) return;
        await prisma.video.deleteMany({
            where: { id: { in: createdVideoIds } },
        });
    });

    it("returns unique folder keys in ascending order", async () => {
        const res = await foldersRouter.request("http://localhost/", { method: "GET" });
        expect(res.status).toBe(200);

        const body = (await res.json()) as string[];
        const filtered = body.filter((k) => k === keyA || k === keyB);

        expect(filtered).toEqual([keyA, keyB]);
    });

    it("returns 500 when folder query fails", async () => {
        vi.resetModules();
        vi.doMock("@/server/lib/db", () => ({
            prisma: {
                video: {
                    findMany: vi.fn().mockRejectedValueOnce(new Error("forced db failure")),
                },
            },
        }));

        const { foldersRouter: mockedFoldersRouter } = await import("@/server/routes/videos/folders");
        const res = await mockedFoldersRouter.request("http://localhost/", { method: "GET" });

        expect(res.status).toBe(500);
        await expect(res.json()).resolves.toEqual({ error: "Failed to fetch folders" });

        vi.doUnmock("@/server/lib/db");
        vi.resetModules();
    });
});

describe("videos foldersRouter rename (DB)", () => {
    const unique = randomUUID().slice(0, 8);
    const from = `rename-${unique}`;
    const to = `renamed-${unique}`;

    afterAll(async () => {
        await prisma.video.deleteMany({ where: { id: { in: createdVideoIds } } });
    });

    function rename(body: { from: string; to: string }) {
        return foldersRouter.request("http://localhost/", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
    }

    async function folderOf(title: string) {
        return (await prisma.video.findFirst({ where: { title } }))?.folderKey;
    }

    it("moves the folder and the folders under it, and leaves a folder with a longer name alone", async () => {
        await createVideo(from, `Top ${unique}`);
        await createVideo(`${from}/scene01`, `Child ${unique}`);
        await createVideo(`${from}-other`, `Sibling ${unique}`);

        const res = await rename({ from, to });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ moved: 2 });
        expect(await folderOf(`Top ${unique}`)).toBe(to);
        expect(await folderOf(`Child ${unique}`)).toBe(`${to}/scene01`);
        expect(await folderOf(`Sibling ${unique}`)).toBe(`${from}-other`);
    });

    it("refuses when a video with the same title is already in the new folder, and moves nothing", async () => {
        const source = `clash-${unique}`;
        const target = `clash-target-${unique}`;
        await createVideo(source, `Same ${unique}`);
        await createVideo(source, `Only here ${unique}`);
        await createVideo(target, `Same ${unique}`);

        const res = await rename({ from: source, to: target });

        expect(res.status).toBe(409);
        expect(await folderOf(`Only here ${unique}`)).toBe(source);
    });
});

