import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { prisma } from "@/server/lib/db";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize, userIdOf } from "@/server/lib/token";

export const seenRouter = createRouter()
    .openapi(createRoute({
        method: "put",
        summary: "Record how far the activity list was seen",
        description: "Records the time up to which the caller has seen the activity list. A time in the future is stored as the current time, and an earlier time than the stored one keeps the stored one.",
        path: "/",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: z.object({ seenAt: z.iso.datetime() }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: "The stored time",
                content: {
                    "application/json": {
                        schema: z.object({ seenAt: z.string().nullable() }),
                    },
                },
            },
            400: errorResponse("Invalid request body"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        const userId = userIdOf(await authorize(c.req.raw, ["viewer", "admin"]));
        const { seenAt } = c.req.valid("json");

        const seenDate = new Date(Math.min(new Date(seenAt).getTime(), Date.now()));

        // The comparison runs in the database, so two requests arriving out of order keep the later time.
        await prisma.user.updateMany({
            where: { id: userId, OR: [{ activitySeenAt: null }, { activitySeenAt: { lt: seenDate } }] },
            data: { activitySeenAt: seenDate },
        });

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { activitySeenAt: true } });

        return c.json({ seenAt: user?.activitySeenAt?.toISOString() ?? null }, 200);
    });
