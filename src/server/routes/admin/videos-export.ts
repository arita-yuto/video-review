import { createRoute, z } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { writeCsv } from "@/server/lib/csv-import";

export const videosExportRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Export videos as CSV",
        description: [
            "Lists the videos in the columns the import reads. Editing folder or title and importing the file moves or renames them.",
            "The files column lists where each revision is stored and is ignored on import.",
        ].join(" "),
        path: "/",
        responses: {
            200: {
                description: "UTF-8 CSV with a BOM",
                content: {
                    "text/csv": {
                        schema: z.string(),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        const videos = await prisma.video.findMany({
            where: { deleted: false },
            orderBy: [{ folderKey: "asc" }, { title: "asc" }],
            include: {
                revisions: {
                    where: { deleted: false },
                    orderBy: { revision: "asc" },
                    select: { revision: true, filePath: true },
                },
            },
        });

        const csv = writeCsv(
            ["id", "folder", "title", "files"],
            videos.map(v => [
                v.id,
                v.folderKey,
                v.title,
                v.revisions.map(r => `${r.revision}=${r.filePath}`).join("; "),
            ]),
        );
        return c.body(csv, 200, {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=\"videos.csv\"",
        });
    });
