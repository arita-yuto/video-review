import "server-only";
import { z } from "zod";
import type { VideoComment } from "@prisma/client";
import { prisma } from "@/server/lib/db";
import { VideoCommentSchema } from "@/schema/zod";

// The reaction kinds the API accepts; the column itself takes any string.
export const reactionKinds = ["thumbsUp"] as const;

export const CommentResponseSchema = VideoCommentSchema.extend({
    reactions: z.object({
        kind: z.enum(reactionKinds),
        userId: z.string(),
        userName: z.string(),
        userEmail: z.string().nullable(),
    }).array(),
});

type CommentResponse = VideoComment & z.infer<typeof CommentResponseSchema>;

export async function commentResponses(comments: VideoComment[]): Promise<CommentResponse[]> {
    const rows = await prisma.videoCommentReaction.findMany({
        where: { commentId: { in: comments.map((comment) => comment.id) } },
        orderBy: { createdAt: "asc" },
        select: { commentId: true, kind: true, userId: true, userName: true },
    });

    const users = rows.length === 0 ? [] : await prisma.user.findMany({
        where: { id: { in: rows.map((row) => row.userId) } },
        select: { id: true, email: true },
    });

    const emails = new Map(users.map((user) => [user.id, user.email]));

    return comments.map((comment) => {
        const reactions = rows
            .filter((row) => row.commentId === comment.id)
            .map(({ kind, userId, userName }) => ({
                kind: kind as (typeof reactionKinds)[number],
                userId,
                userName,
                userEmail: emails.get(userId) ?? null,
            }));

        const thumbsUp = reactions.filter((reaction) => reaction.kind === "thumbsUp").length;

        return { ...comment, thumbsUp, reactions };
    });
}

export async function commentResponse(comment: VideoComment): Promise<CommentResponse> {
    const [response] = await commentResponses([comment]);

    return response;
}
