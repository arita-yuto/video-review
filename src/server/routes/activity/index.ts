import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { prisma } from "@/server/lib/db";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize, userIdOrNull } from "@/server/lib/token";
import { seenRouter } from "@/server/routes/activity/seen";

const KINDS = ["comment", "upload", "reaction"] as const;

type Kind = typeof KINDS[number];

const VideoSchema = z.object({ id: z.string(), title: z.string() });

const CommentEntrySchema = z.object({
    kind: z.literal("comment"),
    id: z.string(),
    occurredAt: z.string(),
    video: VideoSchema,
    commentId: z.string(),
    userName: z.string(),
    userEmail: z.string().nullable(),
    text: z.string(),
    time: z.number(),
    // Null when the revision the comment was written on has been deleted.
    videoRevisionId: z.string().nullable(),
});

const UploadEntrySchema = z.object({
    kind: z.literal("upload"),
    id: z.string(),
    occurredAt: z.string(),
    video: VideoSchema,
    revision: z.number(),
    videoRevisionId: z.string(),
});

const ReactionEntrySchema = z.object({
    kind: z.literal("reaction"),
    id: z.string(),
    occurredAt: z.string(),
    video: VideoSchema,
    commentId: z.string(),
    videoRevisionId: z.string().nullable(),
    userName: z.string(),
    userEmail: z.string().nullable(),
    text: z.string(),
});

const EntrySchema = z.discriminatedUnion("kind", [CommentEntrySchema, UploadEntrySchema, ReactionEntrySchema]);

type Entry = z.infer<typeof EntrySchema>;

const videoSelect = { id: true, title: true } as const;

// A comment stores its revision number only; the review page selects a revision by id.
async function loadRevisionIdLookup(comments: { videoId: string }[]) {
    const revisions = await prisma.videoRevision.findMany({
        where: { videoId: { in: [...new Set(comments.map((comment) => comment.videoId))] }, deleted: false },
        select: { id: true, videoId: true, revision: true },
    });

    const revisionIds = new Map(revisions.map((revision) => [`${revision.videoId}:${revision.revision}`, revision.id]));

    return (comment: { videoId: string; videoRevNum: number }) => {
        return revisionIds.get(`${comment.videoId}:${comment.videoRevNum}`) ?? null;
    };
}

async function loadCommentEntries(limit: number, before: Date | undefined): Promise<Entry[]> {
    const comments = await prisma.videoComment.findMany({
        where: { deleted: false, video: { deleted: false }, createdAt: { lt: before } },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { video: { select: videoSelect } },
    });

    const findRevisionId = await loadRevisionIdLookup(comments);

    return comments.map((comment) => ({
        kind: "comment",
        id: comment.id,
        occurredAt: comment.createdAt.toISOString(),
        video: comment.video,
        commentId: comment.id,
        userName: comment.userName,
        userEmail: comment.userEmail || null,
        text: comment.comment,
        time: comment.time,
        videoRevisionId: findRevisionId(comment),
    }));
}

async function loadUploadEntries(limit: number, before: Date | undefined): Promise<Entry[]> {
    const revisions = await prisma.videoRevision.findMany({
        where: { deleted: false, video: { deleted: false }, uploadedAt: { lt: before } },
        orderBy: { uploadedAt: "desc" },
        take: limit,
        include: { video: { select: videoSelect } },
    });

    return revisions.map((revision) => ({
        kind: "upload",
        id: revision.id,
        occurredAt: revision.uploadedAt.toISOString(),
        video: revision.video,
        revision: revision.revision,
        videoRevisionId: revision.id,
    }));
}

async function loadReactionEntries(limit: number, before: Date | undefined): Promise<Entry[]> {
    const reactions = await prisma.videoCommentReaction.findMany({
        where: { comment: { deleted: false, video: { deleted: false } }, createdAt: { lt: before } },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { comment: { include: { video: { select: videoSelect } } } },
    });

    const findRevisionId = await loadRevisionIdLookup(reactions.map((reaction) => reaction.comment));

    // A reaction stores the user's id and name; the avatar is looked up by email.
    const users = await prisma.user.findMany({
        where: { id: { in: reactions.map((reaction) => reaction.userId) } },
        select: { id: true, email: true },
    });

    const emails = new Map(users.map((user) => [user.id, user.email]));

    return reactions.map((reaction) => ({
        kind: "reaction",
        id: reaction.id,
        occurredAt: reaction.createdAt.toISOString(),
        video: reaction.comment.video,
        commentId: reaction.commentId,
        videoRevisionId: findRevisionId(reaction.comment),
        userName: reaction.userName,
        userEmail: emails.get(reaction.userId) ?? null,
        text: reaction.comment.comment,
    }));
}

const entryLoaders: Record<Kind, (limit: number, before: Date | undefined) => Promise<Entry[]>> = {
    comment: loadCommentEntries,
    upload: loadUploadEntries,
    reaction: loadReactionEntries,
};

export const activityRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "List activity",
        description: "Recent review actions across all videos, newest first. `kind` limits the list to one kind of action. `before` takes the `nextCursor` of the previous page. `seenAt` is the time the caller recorded with `PUT /activity/seen`, and `fetchedAt` is the server time of this request.",
        path: "/",
        request: {
            query: z.object({ kind: z.enum(KINDS).optional(), before: z.iso.datetime().optional() }),
        },
        responses: {
            200: {
                description: "Recent activity",
                content: {
                    "application/json": {
                        schema: z.object({
                            entries: z.array(EntrySchema),
                            nextCursor: z.string().nullable(),
                            seenAt: z.string().nullable(),
                            fetchedAt: z.string(),
                        }),
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        const ENTRY_LIMIT = 50;

        const userId = userIdOrNull(await authorize(c.req.raw, ["viewer", "admin"]));

        const { kind: kindFilter, before } = c.req.valid("query");

        // Taken before the entries are read, so an entry created during the read is later than this time.
        const fetchedAt = new Date();

        const user = userId === null
            ? null
            : await prisma.user.findUnique({ where: { id: userId }, select: { activitySeenAt: true } });

        const kinds = kindFilter ? [kindFilter] : KINDS;
        const beforeDate = before ? new Date(before) : undefined;

        // One entry past the limit per kind tells whether a next page exists; the newest overall are among the newest of each kind.
        const lists = await Promise.all(kinds.map((kind) => entryLoaders[kind](ENTRY_LIMIT + 1, beforeDate)));

        const sorted = lists.flat().sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
        const entries = sorted.slice(0, ENTRY_LIMIT);

        // Entries at the same millisecond as the cursor are skipped.
        const nextCursor = sorted.length > ENTRY_LIMIT ? entries[entries.length - 1].occurredAt : null;

        return c.json({
            entries,
            nextCursor,
            seenAt: user?.activitySeenAt?.toISOString() ?? null,
            fetchedAt: fetchedAt.toISOString(),
        }, 200);
    })
    .route("/seen", seenRouter);
