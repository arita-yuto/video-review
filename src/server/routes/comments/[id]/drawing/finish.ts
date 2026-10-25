import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorizeComment } from "@/server/lib/videos/guest-access";
import { deleteSession, getSession } from "@/server/lib/upload-session";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "@/server/lib/storage";
import { drawingKey } from "@/lib/storage-key";
import { VideoCommentSchema } from "@/schema/zod";
import { broadcastComments } from "@/server/lib/video-stream";

export const finishRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Finish drawing upload",
        description: "Marks the uploaded drawing as the comment's drawing.",
        path: "/",
        request: { query: z.object({ session_id: z.string().min(1) }) },
        responses: {
            200: {
                description: "Drawing upload finished successfully",
                content: {
                    "application/json": {
                        schema: VideoCommentSchema,
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: errorResponse("Comment not found"),
        },
    }), async (c) => {
        const id = c.req.param("id") as string;
        const { comment } = await authorizeComment(c.req.raw, ["viewer", "admin", "guest"], id);
        if (comment.deleted) {
            return c.json({ error: "comment not found" }, 404);
        }

        const { session_id } = c.req.valid("query");
        const session = await getSession(session_id);
        if (!session) {
            return c.json({ error: "missing session" }, 400);
        }

        // The session must be the one opened for this comment; no other key can become its drawing.
        const storageKey = drawingKey(comment.id);
        if (session.storageKey !== storageKey) {
            return c.json({ error: "session does not belong to the comment" }, 400);
        }

        const updated = await prisma.videoComment.update({
            where: { id: comment.id },
            data: { drawingPath: storageKey, hasDrawing: true, updatedAt: new Date() },
        });
        broadcastComments(updated.videoId);

        if (comment.drawingPath && comment.drawingPath !== storageKey) {
            await VideoReviewStorage.deleteObject(comment.drawingPath);
        }
        await deleteSession(session_id);
        return c.json(updated, 200);
    });
