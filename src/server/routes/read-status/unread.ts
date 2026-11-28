import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize, userIdOf } from "@/server/lib/token";

export const unreadRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get unread videos",
        description: "Returns the ids of the videos with comments the caller has not read.",
        path: "/",
        responses: {
            200: {
                description: "Get unread videos",
                content: {
                    "application/json": {
                        schema: z.object({ unreadVideoIds: z.string().array() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("Failed to fetch unread video ids"),
        },
    }), async (c) => {
        const userId = userIdOf(await authorize(c.req.raw, ["viewer", "admin"]));

        try {
            // eslint-disable-next-line no-restricted-syntax -- Prisma would read every comment to pick the latest per video
            const unreadVideoIds = await prisma.$queryRaw<{ videoId: string }[]>`
            WITH latest AS (
                SELECT v.id AS "videoId",
                       c.id AS "latestCommentId"
                FROM "Video" v
                LEFT JOIN LATERAL (
                    SELECT id
                    FROM "VideoComment"
                    WHERE "videoId" = v.id AND deleted = false
                    ORDER BY "createdAt" DESC
                    LIMIT 1
                ) c ON true
                WHERE v.deleted = false
            )
            SELECT l."videoId"
            FROM latest l
            LEFT JOIN "UserVideoReadStatus" s
                   ON s."videoId" = l."videoId"
                  AND s."userId" = ${userId}
            WHERE 
                l."latestCommentId" IS NOT NULL
                AND (
                    s."lastReadCommentId" IS NULL
                    OR s."lastReadCommentId" != l."latestCommentId"
                );
        `;

            return c.json({
                unreadVideoIds: unreadVideoIds.map((x) => x.videoId),
            }, 200);

        } catch {
            return c.json({ error: "failed to fetch unread video ids" }, 500);
        }
    });
