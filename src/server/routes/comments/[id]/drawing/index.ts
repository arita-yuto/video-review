import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorizeComment } from "@/server/lib/videos/guest-access";
import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "@/server/lib/storage";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { CommentResponseSchema, commentResponse } from "@/server/lib/videos/comment-response";
import { initRouter } from "@/server/routes/comments/[id]/drawing/init";
import { finishRouter } from "@/server/routes/comments/[id]/drawing/finish";
import { broadcastComments } from "@/server/lib/video-stream";

export const drawingRouter = createRouter()
    .openapi(createRoute({
        method: "delete",
        summary: "Remove drawing",
        description: "Removes the comment's drawing and its file.",
        path: "/",
        responses: {
            200: {
                description: "Drawing removed",
                content: {
                    "application/json": {
                        schema: CommentResponseSchema,
                    },
                },
            },
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

        if (!comment.hasDrawing) {
            return c.json(await commentResponse(comment), 200);
        }

        const updated = await prisma.videoComment.update({
            where: { id: comment.id },
            data: { hasDrawing: false, updatedAt: new Date() },
        });
        broadcastComments(updated.videoId);

        if (comment.drawingPath) {
            await VideoReviewStorage.deleteObject(comment.drawingPath);
        }
        return c.json(await commentResponse(updated), 200);
    })
    .route("init", initRouter)
    .route("finish", finishRouter);
