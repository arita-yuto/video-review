import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/lib/db";
import { videosExportRouter } from "@/server/routes/admin/videos-export";
import { videosImportRouter } from "@/server/routes/admin/videos-import";

vi.mock("@/server/lib/token", async (importOriginal) => {
    const { withAuthorizePass } = await import("../../../mocks/authorize");
    return withAuthorizePass(await importOriginal<typeof import("@/server/lib/token")>());
});

const unique = randomUUID().slice(0, 8);
const createdVideoIds: string[] = [];

async function createVideo(folderKey: string, title: string) {
    const id = randomUUID();
    await prisma.video.create({ data: { id, title, folderKey, deleted: false } });
    createdVideoIds.push(id);
    return id;
}

async function exportCsv() {
    return (await videosExportRouter.request("http://localhost/")).text();
}

function importCsv(csv: string) {
    return videosImportRouter.request("http://localhost/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
    });
}

describe("video CSV export and import (DB)", () => {
    afterAll(async () => {
        await prisma.video.deleteMany({ where: { id: { in: createdVideoIds } } });
    });

    it("changes nothing when the exported file is imported as it is", async () => {
        const id = await createVideo(`csv-${unique}`, `Opening, "Take 2" ${unique}`);

        // Other test files add and remove videos meanwhile, so only this test's row is read back.
        const [header, ...rows] = (await exportCsv()).split("\r\n");
        const res = await importCsv([header, ...rows.filter(row => row.startsWith(id))].join("\r\n"));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ updated: 0 });
    });

    it("moves and renames the videos whose folder or title was edited", async () => {
        const id = await createVideo(`csv-move-${unique}`, `Before ${unique}`);

        const res = await importCsv(["id,folder,title", `${id},csv-moved-${unique},After ${unique}`].join("\n"));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ updated: 1 });
        expect(await prisma.video.findUnique({ where: { id }, select: { folderKey: true, title: true } }))
            .toEqual({ folderKey: `csv-moved-${unique}`, title: `After ${unique}` });
    });

    it("refuses a folder and title another video already has, and changes nothing", async () => {
        const folder = `csv-clash-${unique}`;
        const moving = await createVideo(folder, `Mine ${unique}`);
        await createVideo(folder, `Theirs ${unique}`);

        const res = await importCsv(["id,folder,title", `${moving},${folder},Theirs ${unique}`].join("\n"));

        expect(res.status).toBe(422);
        expect(await res.json()).toEqual({ errors: [{ line: 2, column: "title", code: "pairTaken" }] });
        expect((await prisma.video.findUnique({ where: { id: moving } }))?.title).toBe(`Mine ${unique}`);
    });
});
