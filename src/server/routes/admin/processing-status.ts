import { createRoute, z } from "@hono/zod-openapi";
import { JobStatus } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";

export const processingStatusRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Count the revisions the video-processing worker has not finished",
        path: "/",
        responses: {
            200: {
                description: "Revisions that are not deleted, by the state of their processing steps",
                content: {
                    "application/json": {
                        schema: z.object({
                            waiting: z.number(),
                            processing: z.number(),
                            failed: z.number(),
                        }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        const live = { deleted: false, video: { deleted: false } };
        const withStep = (status: JobStatus) => ({ steps: { some: { status } } });

        const [waiting, processing, failed] = await Promise.all([
            prisma.videoRevision.count({
                where: {
                    ...live,
                    // A revision without a job is an upload the worker has not taken yet.
                    OR: [
                        { processingJob: null },
                        { processingJob: { steps: { some: { status: JobStatus.pending }, none: { status: JobStatus.running } } } },
                    ],
                },
            }),
            prisma.videoRevision.count({ where: { ...live, processingJob: withStep(JobStatus.running) } }),
            prisma.videoRevision.count({ where: { ...live, processingJob: withStep(JobStatus.failed) } }),
        ]);

        return c.json({ waiting, processing, failed }, 200);
    });
