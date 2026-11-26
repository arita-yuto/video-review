import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { prisma } from "@/server/lib/db";
import { roleOf, type AuthIdentity } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { authorizeComment } from "@/server/lib/videos/guest-access";
import { CommentResponseSchema, commentResponse, reactionKinds } from "@/server/lib/videos/comment-response";
import { broadcastComments } from "@/server/lib/video-stream";

const ParamsSchema = z.object({ kind: z.enum(reactionKinds) });

const responses = {
    200: {
        description: "The comment with its reactions",
        content: {
            "application/json": {
                schema: CommentResponseSchema,
            },
        },
    },
    400: errorResponse("Unknown reaction kind"),
    401: errorResponse("Unauthorized"),
    403: errorResponse("Forbidden"),
    404: errorResponse("Comment not found"),
};

function reactingUser(auth: AuthIdentity) {
    // A reaction belongs to a user, which a guest and the API token are not.
    if (auth.type !== "jwt" || roleOf(auth) === "guest") {
        throw new ServerError("forbidden", 403);
    }

    return auth.decoded;
}

export const reactionsRouter = createRouter()
    .openapi(createRoute({
        method: "put",
        summary: "Add the caller's reaction to a comment",
        description: "Does nothing when the caller already has this reaction.",
        path: "/{kind}",
        request: { params: ParamsSchema },
        responses,
    }), async (c) => {
        const id = c.req.param("id") as string;
        const { kind } = c.req.valid("param");
        const { auth, comment } = await authorizeComment(c.req.raw, ["guest", "viewer", "admin"], id);
        const { id: userId, displayName } = reactingUser(auth);

        // The row rather than the token, so a renamed user gets the new name.
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });

        // skipDuplicates makes a second press by the same person a no-op.
        await prisma.videoCommentReaction.createMany({
            data: [{ commentId: id, userId, userName: user?.displayName ?? String(displayName), kind }],
            skipDuplicates: true,
        });

        broadcastComments(comment.videoId);

        return c.json(await commentResponse(comment), 200);
    })
    .openapi(createRoute({
        method: "delete",
        summary: "Remove the caller's reaction from a comment",
        description: "Does nothing when the caller has no such reaction.",
        path: "/{kind}",
        request: { params: ParamsSchema },
        responses,
    }), async (c) => {
        const id = c.req.param("id") as string;
        const { kind } = c.req.valid("param");
        const { auth, comment } = await authorizeComment(c.req.raw, ["guest", "viewer", "admin"], id);
        const { id: userId } = reactingUser(auth);

        await prisma.videoCommentReaction.deleteMany({
            where: { commentId: id, userId, kind },
        });

        broadcastComments(comment.videoId);

        return c.json(await commentResponse(comment), 200);
    });
