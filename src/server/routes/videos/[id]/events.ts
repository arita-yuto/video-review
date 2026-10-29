import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { prisma } from "@/server/lib/db";
import { VideoEventKindSchema } from "@/schema/zod";
import { VideoEventSchema } from "@/server/lib/openapi/models";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorizeVideo } from "@/server/lib/videos/guest-access";

const QuerySchema = z.object({
    selectRevision: z.coerce.number().int().optional(),
    filterText: z.string().optional(),
    kind: z.string().optional(),
    hasLink: z.string().transform(v => v === "true").optional(),
});

export const eventsRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get video events",
        description: "Retrieves events for a specific video revision.",
        path: "/",
        request: { query: QuerySchema },
        responses: {
            200: {
                description: "Events retrieved successfully",
                content: {
                    "application/json": {
                        schema: VideoEventSchema.extend({ kind: VideoEventKindSchema.pick({ label: true }) }).array(),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            500: errorResponse("Failed to fetch events"),
        },
    }), async (c) => {
        const videoId = c.req.param("id") as string;
        await authorizeVideo(c.req.raw, ["guest", "viewer", "admin"], videoId);

        try {
            const { selectRevision, filterText, kind, hasLink } = c.req.valid("query");

            const events = await prisma.videoEvent.findMany({
                where: {
                    videoRevision: {
                        videoId,
                        ...(selectRevision ? { revision: selectRevision } : {}),
                    },
                    ...(filterText ? { data: { contains: filterText } } : {}),
                    ...(kind ? { kind: { label: kind } } : {}),
                },
                include: {
                    kind: {
                        select: {
                            label: true,
                        },
                    },
                },
                orderBy: [
                    { startMs: "asc" },
                    { seq: "asc" },
                ],
            });

            return c.json(events, 200);
        } catch {
            return c.json({ error: "failed to fetch events" }, 500);
        }
    });
