import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize, roleOf } from "@/server/lib/token";

export const foldersRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get all folder keys",
        description: "Returns a list of all unique folder keys from the database.",
        path: "/",
        responses: {
            200: {
                description: "List of folder keys",
                content: {
                    "application/json": {
                        schema: z.array(z.string()),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            500: {
                description: "Internal Server Error",
            },
        },
    }), async (c) => {
        const auth = await authorize(c.req.raw, ["guest", "viewer", "admin"]);
        const role = roleOf(auth);

        try {
            const keys = await prisma.video.findMany({
                where: role === "guest" ? { guestVisible: true } : {},
                select: { folderKey: true },
                distinct: ["folderKey"],
                orderBy: { folderKey: "asc" },
            });
            return c.json(keys.map((k) => k.folderKey));
        } catch {
            return c.json({ error: "Failed to fetch folders" }, { status: 500 });
        }
    })
    .openapi(createRoute({
        method: "patch",
        summary: "Rename a folder",
        description: [
            "Moves every video in the folder, and in the folders under it, to the new folder key.",
            "Uploads that still send the old folder key create new videos.",
        ].join(" "),
        path: "/",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: z.object({
                            from: z.string().trim().min(1),
                            to: z.string().trim().min(1),
                        }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: "The folder was renamed",
                content: {
                    "application/json": {
                        schema: z.object({ moved: z.number() }),
                    },
                },
            },
            400: errorResponse("The new name is the same as the old one"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: errorResponse("No video is in the folder"),
            409: errorResponse("A video with the same title is already in the new folder"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);
        const { from, to } = c.req.valid("json");

        if (from === to) {
            return c.json({ error: "the new name is the same as the old one" }, 400);
        }

        const videos = await prisma.video.findMany({
            where: { OR: [{ folderKey: from }, { folderKey: { startsWith: `${from}/` } }] },
            select: { id: true, title: true, folderKey: true },
        });
        if (videos.length === 0) {
            return c.json({ error: "no video is in the folder" }, 404);
        }

        const moves = videos.map(v => ({ ...v, folderKey: to + v.folderKey.slice(from.length) }));

        // Uploads find their video by title and folder, so a moved video may not land on another's pair.
        const movedIds = moves.map(m => m.id);
        const taken = await prisma.video.findFirst({
            where: {
                id: { notIn: movedIds },
                OR: moves.map(m => ({ title: m.title, folderKey: m.folderKey })),
            },
            select: { id: true },
        });
        if (taken) {
            return c.json({ error: "a video with the same title is already in the new folder" }, 409);
        }

        await prisma.$transaction(moves.map(m => prisma.video.update({
            where: { id: m.id },
            data: { folderKey: m.folderKey },
        })));

        return c.json({ moved: moves.length }, 200);
    });
