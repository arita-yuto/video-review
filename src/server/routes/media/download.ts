import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { VideoReviewStorage } from "@/server/lib/storage";
import { prisma } from "@/server/lib/db";
import { formatVideoRes } from "@/server/lib/utils/format-video-res";
import { getResolutionPresets } from "@/server/lib/integrations/general";

export const downloadRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Download media",
        description: "Returns the media file for download.",
        path: "/",
        request: {
            query: z.object({
                videoId: z.string().min(1),
                videoRevId: z.string().min(1).optional(),
                width: z.string().optional(),
            }),
        },
        responses: {
            200: {
                description: "Download media",
            },
            400: {
                description: "Invalid parameters",
            },
            401: {
                description: "Unauthorized",
            },
            404: {
                description: "Video revision not found",
            },
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["viewer", "admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "unauthorized" }, { status: 401 });
        }

        const { videoId, videoRevId, width } = c.req.valid("query");

        console.log(`Received download request for videoId: ${videoId}, videoRevId: ${videoRevId}, width: ${width}`);

        // Without videoRevId (e.g. the maintenance CLI's create-video-tmb) serve the latest live revision.
        const videoRev = await prisma.videoRevision.findFirst({
            where: videoRevId
                ? { id: videoRevId, videoId }
                : { videoId, deleted: false },
            orderBy: { revision: "desc" },
            include: {
                video: {
                    select: { title: true },
                },
            },
        });

        if (!videoRev) {
            return c.json({ error: "Video revision not found" }, { status: 404 });
        }

        let storageKey = videoRev.filePath;
        if (width) {
            const targetWidth = parseInt(width);
            if (!isNaN(targetWidth) && (await getResolutionPresets()).includes(targetWidth)) {
                storageKey = formatVideoRes(storageKey, targetWidth);
            }
        }

        const stream = await VideoReviewStorage.download(storageKey);
        return stream;
    });
