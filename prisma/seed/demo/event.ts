import type { PrismaClient } from "@prisma/client";
import { insertEvents } from "../insert";
import { SeedNode } from "../seed-node";
import type { VideoNode } from "./video";

// Every revision gets all of these.
const events = [
    {
        kind: "shot_type",
        startMs: 0,
        endMs: 5000,
        data: "wide-shot",
        contentId: "shot-001",
        links: [
            { label: "Shot Design Doc", url: "https://example.com/docs/shot-design" },
            { url: "https://example.com/reference/wide-shot" },
        ],
    },
    {
        kind: "angle_type",
        startMs: 0,
        endMs: 5000,
        data: "neutral",
    },
    {
        kind: "transcription",
        startMs: 1000,
        endMs: 4200,
        data: "Sample dialogue line for seed data.",
        contentId: "transcription-001",
        links: [
            { label: "Script", url: "https://example.com/scripts/scene-01" },
        ],
    },
    {
        kind: "detected_text",
        startMs: 1800,
        endMs: 2200,
        data: "START",
    },
];

export class EventNode extends SeedNode<VideoNode> {
    protected async insert(prisma: PrismaClient): Promise<void> {
        await insertEvents(prisma, this.parent.videos.flatMap((video) => {
            return events.map((event) => {
                return { ...event, revisionId: video.row.revisions[0].id };
            });
        }));
    }
}
