import { createVideoCommentLink } from "@/lib/url";
import { prisma } from "@/server/lib/db";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { issueTracker } from "@/server/lib/issue-tracker";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { VideoCommentSchema } from "@/schema/zod";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { broadcastComments } from "@/server/lib/video-stream";

// The public origin comes from the browser: the server may sit behind a proxy and not know it.
const IssueForm = z.object({
    baseURL: z.string().min(1),
    issueType: z.string().min(1),
    // Binary format must be spelled out: zod-openapi cannot map z.file() on its own.
    file: z.file().optional().openapi({ type: "string", format: "binary" }),
});

export const issueRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Create an issue from a comment",
        description: "Creates an issue in the configured tracker from the comment text and links it to the comment.",
        path: "/",
        request: {
            body: {
                content: {
                    "multipart/form-data": {
                        schema: IssueForm,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Issue created and linked; returns the updated comment",
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
            500: errorResponse("Issue tracker not configured or rejected the request"),
        },
    }), async (c) => {
        let auth: Awaited<ReturnType<typeof authorize>>;
        try {
            auth = await authorize(c.req.raw, ["viewer", "admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403 | 500);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        try {
            const id = c.req.param("id");
            const { baseURL, issueType, file } = c.req.valid("form");

            const comment = await prisma.videoComment.findUnique({ where: { id }, include: { video: { select: { title: true } } } });
            if (!comment) {
                return c.json({ error: "comment not found" }, 404);
            }

            // The issue is filed as the caller; the API token files it as the integration itself.
            const reporter = auth.type === "jwt"
                ? await prisma.user.findUnique({ where: { id: auth.decoded.id }, select: { email: true } })
                : null;

            const tracker = await issueTracker();
            if (!tracker) {
                throw new ServerError("issue tracker is not configured", 500);
            }

            const issueKey = await tracker.createIssue({
                source: {
                    comment: comment.comment,
                    videoTitle: comment.video.title,
                    time: comment.time,
                    author: comment.userName,
                    link: createVideoCommentLink(baseURL, comment.videoId, comment.id),
                },
                issueType,
                reporterEmail: reporter?.email ?? undefined,
                attachment: file,
            });

            const updated = await prisma.videoComment.update({
                where: { id },
                data: { issueId: issueKey, updatedAt: new Date() },
            });
            broadcastComments(updated.videoId);
            return c.json(updated, 200);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403 | 500);
            }
            return c.json({ error: "internal error" }, 500);
        }
    });
