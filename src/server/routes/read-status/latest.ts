import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorizeVideo } from "@/server/lib/videos/guest-access";

export const latestRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get latest comment",
        description: "Returns the latest comment of a video by its ID.",
        path: "/",
        request: { query: z.object({ videoId: z.string().min(1) }) },
        responses: {
            200: {
                description: "Get latest comment",
                content: {
                    "application/json": {
                        schema: z.object({ latestCommentId: z.string().nullable() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            400: errorResponse("Missing videoId"),
            500: errorResponse("Failed to fetch latest comment"),
        },
    }), async (c) => {
        const { videoId } = c.req.valid("query");
        await authorizeVideo(c.req.raw, ["viewer", "admin"], videoId);

        try {
            const latest = await prisma.videoComment.findFirst({
                where: { videoId, deleted: false },
                orderBy: { createdAt: "desc" },
                select: { id: true },
            });

            return c.json({ latestCommentId: latest?.id ?? null }, 200);
        } catch {
            return c.json({ error: "failed to fetch latest comment" }, 500);
        }
    });
