import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorizeComment } from "@/server/lib/videos/guest-access";
import { issueTracker } from "@/server/lib/issue-tracker";
import { IssueStatusSchema } from "@/server/lib/issue-tracker/tracker";
import { ServerError } from "@/server/lib/server-error";
import { broadcastComments } from "@/server/lib/video-stream";

const TransitionSchema = z.object({ id: z.string(), name: z.string() });

export const transitionsRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Transitions the comment's issue can take now",
        path: "/",
        responses: {
            200: {
                description: "Transitions in the tracker's order",
                content: { "application/json": { schema: z.array(TransitionSchema) } },
            },
            400: errorResponse("Comment has no issue"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: errorResponse("Comment not found"),
            500: errorResponse("Issue tracker not configured or unreachable"),
        },
    }), async (c) => {
        const { comment } = await authorizeComment(c.req.raw, ["viewer", "admin"], c.req.param("id") as string);
        if (!comment.issueId) {
            throw new ServerError("comment has no issue", 400);
        }

        const tracker = await issueTracker();
        if (!tracker) {
            throw new ServerError("issue tracker is not configured", 500);
        }

        return c.json(await tracker.listTransitions(comment.issueId), 200);
    })
    .openapi(createRoute({
        method: "post",
        summary: "Move the comment's issue through a transition",
        description: "Applies the transition in the tracker and returns the issue's new status. The tracker's own refusal, such as a transition that needs more fields, is passed on as the error message.",
        path: "/",
        request: {
            body: { content: { "application/json": { schema: z.object({ transitionId: z.string().min(1) }) } } },
        },
        responses: {
            200: {
                description: "The issue's status after the transition",
                content: { "application/json": { schema: IssueStatusSchema } },
            },
            400: errorResponse("Comment has no issue, or the tracker refused the transition"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: errorResponse("Comment not found"),
            500: errorResponse("Issue tracker not configured or unreachable"),
        },
    }), async (c) => {
        const { comment } = await authorizeComment(c.req.raw, ["viewer", "admin"], c.req.param("id") as string);
        if (!comment.issueId) {
            throw new ServerError("comment has no issue", 400);
        }
        const { transitionId } = c.req.valid("json");

        const tracker = await issueTracker();
        if (!tracker) {
            throw new ServerError("issue tracker is not configured", 500);
        }

        await tracker.transition(comment.issueId, transitionId);
        // So other viewers' chips pick up the new status, even if the read below fails.
        broadcastComments(comment.videoId);

        const issue = await tracker.getIssue(comment.issueId);
        if (!issue) {
            throw new ServerError(`issue ${comment.issueId} was not found after the transition`, 500);
        }

        return c.json(issue.status, 200);
    });
