import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { deleteSession, getSession } from "@/server/lib/upload-session";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { VideoRevisionSchema } from "@/schema/zod";
import { VideoReviewStorage } from "@/server/lib/storage";

export const finishRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Finish upload",
        description: "Finalizes the upload session and creates video and revision records in the database.",
        path: "/",
        request: { query: z.object({ session_id: z.string().min(1) }) },
        responses: {
            200: {
                description: "The created revision; empty when the session's video no longer exists",
                content: {
                    "application/json": {
                        schema: VideoRevisionSchema.optional(),
                    },
                },
            },
            400: errorResponse("Bad request"),
            409: errorResponse("The uploaded file is not in storage"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("Auth configuration is missing"),
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403 | 500);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        const { session_id } = c.req.valid("query");

        const session = await getSession(session_id);
        if (!session) {
            return c.json({ error: "missing session" }, 400);
        }

        const title = session.title
        const folderKey = session.folderKey
        const scenePath = session.scenePath
        const vcsWatchPaths = session.vcsWatchPaths
        const nextRev = session.nextRev;
        const storageKey = session.storageKey;

        // The transfer can fail after the session is created, so the file has to be in storage
        // before a revision publishes it.
        if (!await VideoReviewStorage.hasObject(storageKey)) {
            return c.json({ error: "the uploaded file is not in storage" }, 409);
        }

        const revision = await prisma.$transaction(async (tx) => {
            let video = await tx.video.findFirst({ where: { title, folderKey } });
            if (video) {
                const newRevision = await tx.videoRevision.create({
                    data: {
                        id: session_id,
                        videoId: video.id,
                        revision: nextRev,
                        filePath: storageKey,
                    },
                });

                await tx.video.update({
                    where: { id: video.id },
                    data: {
                        scenePath,
                        vcsWatchPaths,
                        latestRevisionNum: newRevision.revision,
                        latestUpdatedAt: newRevision.uploadedAt,
                        deleted: false,
                    },
                });
                return newRevision;
            }
        });

        await deleteSession(session_id);
        return c.json(revision, 200);
    });
