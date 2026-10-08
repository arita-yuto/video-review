import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { patchVideoRouter } from "@/server/routes/videos/[id]/patch";

vi.mock("@/server/lib/token", async (importOriginal) => {
    const { withAuthorizePass } = await import("../../../mocks/authorize");
    return withAuthorizePass(await importOriginal<typeof import("@/server/lib/token")>());
});

describe("videos patchVideoRouter guestVisible", () => {
    const app = new Hono();
    app.route("/videos/:id", patchVideoRouter);

    afterEach(() => {
        vi.restoreAllMocks();
    });

    async function patch(id: string, guestVisible: boolean) {
        vi.spyOn(prisma.video, "findUnique").mockResolvedValue({ id } as never);
        const update = vi.spyOn(prisma.video, "update").mockResolvedValue({ id, guestVisible } as never);

        const res = await app.request(`http://localhost/videos/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ guestVisible }),
        });
        return { res, update };
    }

    it("sets guestVisible true", async () => {
        const { res, update } = await patch("video-1", true);
        expect(res.status).toBe(200);
        expect(update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "video-1" },
                data: expect.objectContaining({ guestVisible: true }),
            })
        );
    });

    it("sets guestVisible false", async () => {
        const { res, update } = await patch("video-2", false);
        expect(res.status).toBe(200);
        expect(update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "video-2" },
                data: expect.objectContaining({ guestVisible: false }),
            })
        );
    });
});

describe("videos patchVideoRouter title and folderKey", () => {
    const app = new Hono();
    app.route("/videos/:id", patchVideoRouter);

    afterEach(() => {
        vi.restoreAllMocks();
    });

    async function patch(body: Record<string, string>, taken: boolean) {
        vi.spyOn(prisma.video, "findUnique").mockResolvedValue({ id: "video-1", title: "Opening", folderKey: "projectA" } as never);
        vi.spyOn(prisma.video, "findFirst").mockResolvedValue((taken ? { id: "video-2" } : null) as never);
        const update = vi.spyOn(prisma.video, "update").mockResolvedValue({ id: "video-1" } as never);

        const res = await app.request("http://localhost/videos/video-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
        return { res, update };
    }

    it("renames the video and moves it to another folder", async () => {
        const { res, update } = await patch({ title: "Ending", folderKey: "projectB" }, false);

        expect(res.status).toBe(200);
        expect(update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "video-1" },
            data: expect.objectContaining({ title: "Ending", folderKey: "projectB" }),
        }));
    });

    it("refuses a title another video already has in that folder", async () => {
        const { res, update } = await patch({ folderKey: "projectB" }, true);

        expect(res.status).toBe(409);
        expect(update).not.toHaveBeenCalled();
    });
});
