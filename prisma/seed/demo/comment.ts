import type { PrismaClient } from "@prisma/client";
import { insertComments, insertReadStatuses } from "../insert";
import type { SeedUsers } from "../user";
import { picked, type DemoVideo } from "./video";

// A video that gets comments gets all of these, in this order.
// `percent` and `multiplier` pick the videos where the comment has that issue, Slack notification or drawing.
const comments = [
    {
        author: "Bocchi",
        text: "Um… this cut might be a little fast… or maybe it's just me.",
        time: 1,
    },
    {
        author: "Kita",
        text: "This part is really cool! The timing around 2.3s just feels a bit tight though.",
        time: 9,
        issue: { id: "ISSUE-123", percent: 70, multiplier: 73 },
        slack: { percent: 70, multiplier: 89 },
    },
    {
        author: "Ryo",
        text: "The cut happens slightly before the motion settles.",
        time: 17,
        drawing: { path: "/drawings/sample.png", percent: 70, multiplier: 61 },
    },
    {
        author: "Bocchi",
        text: "If it's not too much trouble, maybe easing the transition could help.",
        time: 25,
    },
];

// Each reader has read the last comment on the videos picked by `percent` and `multiplier`.
const readers = [
    { name: "Bocchi", percent: 70, multiplier: 3 },
    { name: "Kita", percent: 70, multiplier: 7 },
    { name: "Ryo", percent: 70, multiplier: 11 },
    { name: "Nijika", percent: 70, multiplier: 17 },
];

export async function insertDemoComments(prisma: PrismaClient, videos: DemoVideo[], users: SeedUsers): Promise<void> {
    const commentedVideos = videos.filter((video) => picked(video.index, 40, 37));
    const firstCreatedAt = Date.now();

    const ids = await insertComments(prisma, commentedVideos.flatMap((video) => {
        return comments.map((comment, position) => {
            const hasIssue = comment.issue && picked(video.index, comment.issue.percent, comment.issue.multiplier);
            const isNotified = comment.slack && picked(video.index, comment.slack.percent, comment.slack.multiplier);
            const hasDrawing = comment.drawing && picked(video.index, comment.drawing.percent, comment.drawing.multiplier);

            return {
                videoId: video.row.id,
                revision: 1,
                author: users.user(comment.author),
                text: comment.text,
                time: comment.time,
                // The unread check takes the newest comment by createdAt, so comments of one video must not tie.
                createdAt: new Date(firstCreatedAt + position * 1000),
                issueId: hasIssue ? comment.issue.id : undefined,
                notifiedProviders: isNotified ? ["slack"] : [],
                drawingPath: hasDrawing ? comment.drawing.path : undefined,
            };
        });
    }));

    await insertReadStatuses(prisma, commentedVideos.flatMap((video, videoPosition) => {
        const lastCommentId = ids[(videoPosition + 1) * comments.length - 1];

        return readers
            .filter((reader) => picked(video.index, reader.percent, reader.multiplier))
            .map((reader) => {
                return { userId: users.user(reader.name).id, videoId: video.row.id, lastReadCommentId: lastCommentId };
            });
    }));
}
