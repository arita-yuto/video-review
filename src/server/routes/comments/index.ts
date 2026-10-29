import { PrismaTypes } from "@/lib/db-types";
import { prisma } from "@/server/lib/db";
import { createRoute } from "@hono/zod-openapi";
import { compress } from "hono/compress";
import { createRouter } from "@/server/lib/openapi/router";
import { byIdRouter } from "@/server/routes/comments/[id]";
import { lastUpdatedRouter } from "@/server/routes/comments/last-updated";
import { usersRouter } from "@/server/routes/comments/users";
import { issueTypesRouter } from "@/server/routes/comments/issue-types";
import { issueLookupRouter } from "@/server/routes/comments/issue-lookup";
import { z } from "zod";
import { toDateRange } from "@/lib/utils/date-helper";
import { VideoCommentSchema } from "@/schema/zod";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize, roleOf, userIdOrNull } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { authorizeComment, authorizeVideo } from "@/server/lib/videos/guest-access";
import { drawingKey } from "@/lib/storage-key";
import { canEditComment } from "@/lib/role";
import { v4 as uuidv4 } from "uuid";
import { VideoReviewStorage } from "@/server/lib/storage";
import { broadcastComments } from "@/server/lib/video-stream";
import { issueTracker } from "@/server/lib/issue-tracker";

const QuerySchema = z.object({
    videoId: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    hasDrawing: z.string().transform(v => v === "true").optional(),
    hasIssue: z.string().transform(v => v === "true").optional(),
    selectRevision: z.coerce.number().int().optional(),
    revisionFrom: z.coerce.number().int().optional(),
    revisionTo: z.coerce.number().int().optional(),
    user: z.string().optional(),
    filterText: z.string().optional(),
});

const CreateCommentBody = z.object({
    videoId: z.string().min(1),
    videoRevNum: z.number().int(),
    userName: z.string(),
    userEmail: z.string(),
    comment: z.string().min(1),
    time: z.number(),
    issueId: z.string().nullable().optional(),
});

const UpdateCommentBody = z.object({
    id: z.string().min(1),
    comment: z.string().optional(),
    issueId: z.string().nullable().optional(),
    thumbsUp: z.boolean().optional(),
    deleted: z.boolean().optional(),
    notifiedProviders: z.string().array().optional(),
});

// Every open screen fetches the whole list again when a comment changes, so it travels compressed.
const router = createRouter();
router.use("/", compress());

export const commentsRouter = router
    .openapi(createRoute({
        method: "get",
        summary: "Get comments",
        description: "Retrieves comments for a specific video.",
        path: "/",
        request: { query: QuerySchema },
        responses: {
            200: {
                description: "Comments retrieved successfully",
                content: {
                    "application/json": {
                        schema: VideoCommentSchema.array(),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            500: errorResponse("Failed to fetch comments"),
        },
    }), async (c) => {
        // eslint-disable-next-line no-restricted-syntax -- lists across videos; guests are filtered by guestVisible below
        const auth = await authorize(c.req.raw, ["guest", "viewer", "admin"]);

        try {
            const query = c.req.valid("query");
            const {
                videoId,
                from,
                to,
                hasDrawing,
                hasIssue,
                selectRevision,
                revisionFrom,
                revisionTo,
                user,
                filterText,
            } = query;

            const dateRange = toDateRange(from ? new Date(from) : undefined, to ? new Date(to) : undefined);

            const where: PrismaTypes.VideoCommentWhereInput = {
                deleted: false,
            };

            if (roleOf(auth) === "guest") {
                where.video = { guestVisible: true };
            }

            if (videoId) {
                where.videoId = videoId;
            }

            if (dateRange.from !== undefined && dateRange.to !== undefined) {
                where.createdAt = { gte: dateRange.from, lte: dateRange.to };
            }

            if (selectRevision) {
                where.videoRevNum = selectRevision;
            } else if (videoId) {
                // Comments outlive a purged revision; the list shows them only while it exists.
                const liveRevisions = await prisma.videoRevision.findMany({
                    where: { videoId, deleted: false },
                    select: { revision: true },
                });
                where.videoRevNum = { in: liveRevisions.map((r) => r.revision), gte: revisionFrom, lte: revisionTo };
            }

            if (hasIssue) {
                where.issueId = { not: null };
            }

            if (user) {
                where.userName = user;
            }

            if (hasDrawing) {
                where.hasDrawing = true;
            }

            if (filterText) {
                where.comment = { contains: filterText };
            }

            const comments = await prisma.videoComment.findMany({
                where,
                orderBy: { time: "asc" }
            });

            return c.json(comments, 200);
        } catch {
            return c.json({ error: "failed to fetch comments" }, 500);
        }
    })
    .openapi(createRoute({
        method: "post",
        summary: "Create comment",
        path: "/",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: CreateCommentBody,
                    },
                },
            },
        },
        responses: {
            201: {
                description: "Comment created",
                content: {
                    "application/json": {
                        schema: VideoCommentSchema,
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            400: errorResponse("Invalid parameters, or an issue key the tracker could not confirm"),
            500: errorResponse("Failed to create comment"),
        },
    }), async (c) => {
        const {
            videoId,
            videoRevNum,
            userName,
            comment,
            time,
            issueId,
            userEmail,
        } = c.req.valid("json");
        const auth = await authorizeVideo(c.req.raw, ["guest", "viewer", "admin"], videoId);
        const issueKey = issueId?.trim();
        if (issueKey) {
            await assertIssueExists(issueKey);
        }

        const userId = userIdOrNull(auth);

        try {
            // The drawing key is fixed at creation.
            const id = uuidv4();
            const result = await prisma.videoComment.create({
                data: {
                    id,
                    drawingPath: drawingKey(id),
                    userId,
                    isGuest: roleOf(auth) === "guest",
                    videoId,
                    videoRevNum,
                    userName,
                    comment,
                    time,
                    issueId: issueKey,
                    userEmail,
                },
            });
            broadcastComments(videoId);

            return c.json(result, 201);
        } catch {
            return c.json({ error: "failed to create comment" }, 500);
        }
    })
    .openapi(createRoute({
        method: "patch",
        summary: "Update comment",
        path: "/",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: UpdateCommentBody,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Comment updated",
                content: {
                    "application/json": {
                        schema: VideoCommentSchema,
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: errorResponse("Comment not found"),
            400: errorResponse("Invalid parameters, or an issue key the tracker could not confirm"),
            500: errorResponse("Failed to update comment"),
        },
    }), async (c) => {
        const { id, comment, deleted, issueId, thumbsUp, notifiedProviders } = c.req.valid("json");
        const { auth, comment: target } = await authorizeComment(c.req.raw, ["guest", "viewer", "admin"], id);

        // Thumbs up and the notification record stay open to everyone.
        const editsAuthorFields = comment !== undefined || issueId !== undefined || deleted !== undefined;
        if (editsAuthorFields && !canEditComment(target, roleOf(auth), userIdOrNull(auth))) {
            throw new ServerError("forbidden", 403);
        }
        // A key the comment already has is never re-checked, so a comment whose issue is gone stays editable.
        const issueKey = issueId?.trim();
        if (issueKey && issueKey !== target.issueId) {
            await assertIssueExists(issueKey);
        }

        try {
            const updateData: PrismaTypes.VideoCommentUpdateInput = {
                updatedAt: new Date(),
            };

            if (typeof comment === "string") {
                updateData.comment = comment;
            }
            if (typeof issueKey === "string") {
                updateData.issueId = issueKey;
            }
            if (typeof deleted === "boolean") {
                updateData.deleted = deleted;
            }
            // A deleted comment is never shown again, so its drawing goes with it.
            if (deleted === true) {
                updateData.hasDrawing = false;
            }
            if (thumbsUp === true) {
                updateData.thumbsUp = { increment: 1 };
            }
            if (notifiedProviders) {
                updateData.notifiedProviders = notifiedProviders;
            }

            const updated = await prisma.videoComment.update({
                where: { id },
                data: updateData
            });
            broadcastComments(updated.videoId);

            if (deleted === true && updated.drawingPath) {
                await VideoReviewStorage.deleteObject(updated.drawingPath);
            }

            return c.json(updated, 200);
        } catch {
            return c.json({ error: "failed to update comment" }, 500);
        }
    })
    .route("/last-updated", lastUpdatedRouter)
    .route("/users", usersRouter)
    .route("/issue-types", issueTypesRouter)
    .route("/issue-lookup", issueLookupRouter)
    .route("/:id", byIdRouter);

// Fails unless the tracker confirms the key; an unreachable tracker counts as unconfirmed.
async function assertIssueExists(key: string): Promise<void> {
    const tracker = await issueTracker();
    if (!tracker) {
        return;
    }

    const issue = await tracker.getIssue(key).catch(() => undefined);
    if (issue === null) {
        throw new ServerError(`issue ${key} was not found`, 400);
    }
    if (issue === undefined) {
        throw new ServerError(`issue ${key} could not be checked: the issue tracker did not answer`, 400);
    }
}
