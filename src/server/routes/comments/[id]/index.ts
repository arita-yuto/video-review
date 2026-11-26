import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { externalLinksRouter } from "@/server/routes/comments/[id]/external-links";
import { issueRouter } from "@/server/routes/comments/[id]/issue";
import { drawingRouter } from "@/server/routes/comments/[id]/drawing";
import { transitionsRouter } from "@/server/routes/comments/[id]/transitions";
import { reactionsRouter } from "@/server/routes/comments/[id]/reactions";
import { CommentResponseSchema, commentResponse } from "@/server/lib/videos/comment-response";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorizeComment } from "@/server/lib/videos/guest-access";

export const byIdRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get comment by ID",
        description: "Retrieves a comment by its ID.",
        path: "/",
        responses: {
            200: {
                description: "Comment retrieved successfully",
                content: {
                    "application/json": {
                        schema: CommentResponseSchema,
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: errorResponse("Comment not found"),
            500: errorResponse("Failed to fetch comment"),
        },
    }), async (c) => {
        const { comment } = await authorizeComment(c.req.raw, ["guest", "viewer", "admin"], c.req.param("id") as string);

        return c.json(await commentResponse(comment), 200);
    })
    .route("external-links", externalLinksRouter)
    .route("issue", issueRouter)
    .route("drawing", drawingRouter)
    .route("transitions", transitionsRouter)
    .route("reactions", reactionsRouter);
