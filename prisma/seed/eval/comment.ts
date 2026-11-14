import type { PrismaClient } from "@prisma/client";
import { insertComments } from "../insert";
import { SeedNode } from "../seed-node";
import type { VideoNode } from "./video";

const comments = [
    { video: "boss-dragon", revision: 2, author: "Kita", text: "The dragon's tail clips through the floor at 0:12", time: 12, issueId: "BUG-201", drawing: true },
    { video: "boss-dragon", revision: 2, author: "Ryo", text: "Camera shake feels too strong during the roar", time: 25 },
    { video: "tutorial-movement", revision: 1, author: "Nijika", text: "Jump prompt text is too small on 1080p", time: 8 },
    { video: "cutscene-opening", revision: 2, author: "Bocchi", text: "Um... the cut at 0:05 might be a bit fast", time: 5 },
    { video: "ui-inventory", revision: 1, author: "Kita", text: "Item icons overlap when there are more than 20 items", time: 14, issueId: "BUG-215" },
    { video: "ai-patrol", revision: 1, author: "Ryo", text: "Guards ignore the player when crouching behind crates", time: 40, issueId: "AI-77" },
    { video: "boss-golem", revision: 1, author: "Bocchi", text: "The golem's hitbox seems off when it slams the ground", time: 18, drawing: true },
    { video: "level-forest", revision: 1, author: "Nijika", text: "Path is too narrow near the bridge", time: 33 },
    { video: "loc-japanese-menu", revision: 1, author: "Kita", text: "メニューの文字が枠からはみ出しています", time: 3, issueId: "LOC-12" },
    { video: "perf-crowd", revision: 1, author: "Ryo", text: "Frame rate drops to 20fps with 200 NPCs on screen", time: 50 },
];

export class CommentNode extends SeedNode<VideoNode> {
    protected async insert(prisma: PrismaClient): Promise<void> {
        const root = this.parent.parent.parent;

        await insertComments(prisma, comments.map((comment) => {
            const video = this.parent.row(comment.video);

            return {
                videoId: video.id,
                revision: comment.revision,
                author: root.user(comment.author),
                text: comment.text,
                time: comment.time,
                createdAt: video.revisions[comment.revision - 1].uploadedAt,
                issueId: comment.issueId,
                drawingPath: comment.drawing ? `/drawings/eval/${comment.video}.png` : undefined,
            };
        }));
    }
}
