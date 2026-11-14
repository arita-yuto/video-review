import type { PrismaClient } from "@prisma/client";
import { insertVideos, type VideoRow } from "../insert";
import { SeedNode } from "../seed-node";
import type { EvalNode } from "./index";

// `key` is what the comment, event and vcs files use to point at a video.
// Dates are relative to "now" so time-based questions ("uploaded this week") keep working.
const videos: {
    key: string;
    title: string;
    folder: string;
    vcsWatchPaths?: string[];
    deleted?: boolean;
    revisions: { daysAgo: number; tags: string[]; summary?: string }[];
}[] = [
    {
        key: "boss-dragon",
        title: "Boss Fight - Dragon Phase 2",
        folder: "battle",
        vcsWatchPaths: ["Assets/Boss/", "Assets/Camera/"],
        revisions: [
            { daysAgo: 20, tags: ["boss", "battle", "wip"] },
            {
                daysAgo: 3,
                tags: ["boss", "battle", "bug"],
                summary: "Second phase of the dragon boss fight with the new tail sweep attack.",
            },
        ],
    },
    {
        key: "tutorial-movement",
        title: "Tutorial - Movement Basics",
        folder: "tutorial",
        revisions: [
            { daysAgo: 45, tags: ["tutorial", "ui"] },
        ],
    },
    {
        key: "cutscene-opening",
        title: "Cutscene - Opening",
        folder: "cutscene",
        vcsWatchPaths: ["Assets/Cutscenes/"],
        revisions: [
            { daysAgo: 60, tags: ["cutscene", "wip"] },
            {
                daysAgo: 10,
                tags: ["cutscene", "camera"],
                summary: "Opening cutscene with the reworked camera path over the kingdom.",
            },
        ],
    },
    {
        key: "ui-inventory",
        title: "UI - Inventory Screen",
        folder: "ui",
        vcsWatchPaths: ["Assets/UI/"],
        revisions: [
            { daysAgo: 5, tags: ["ui", "bug"] },
        ],
    },
    {
        key: "shader-water",
        title: "Shader - Water Reflection Test",
        folder: "graphics",
        vcsWatchPaths: ["Assets/Shaders/"],
        revisions: [
            { daysAgo: 2, tags: ["shader", "graphics", "wip"] },
        ],
    },
    {
        key: "ai-patrol",
        title: "Enemy AI - Patrol Behaviour",
        folder: "ai",
        vcsWatchPaths: ["Assets/AI/"],
        revisions: [
            { daysAgo: 15, tags: ["ai", "enemy"] },
        ],
    },
    {
        key: "audio-footsteps",
        title: "Audio - Footstep Mix",
        folder: "audio",
        revisions: [
            { daysAgo: 90, tags: ["audio"] },
        ],
    },
    {
        key: "boss-golem",
        title: "Boss Fight - Golem Phase 1",
        folder: "battle",
        revisions: [
            { daysAgo: 30, tags: ["boss", "battle"] },
        ],
    },
    {
        key: "level-forest",
        title: "Level - Forest Path Blockout",
        folder: "level",
        vcsWatchPaths: ["Assets/Levels/Forest/"],
        revisions: [
            { daysAgo: 120, tags: ["level", "blockout"] },
            { daysAgo: 40, tags: ["level", "lighting"] },
        ],
    },
    {
        key: "loc-japanese-menu",
        title: "Localization - Japanese Menu Check",
        folder: "ui",
        revisions: [
            { daysAgo: 8, tags: ["ui", "localization", "japanese"] },
        ],
    },
    {
        key: "perf-crowd",
        title: "Performance - Crowd Scene Stress",
        folder: "perf",
        vcsWatchPaths: ["Assets/Crowd/"],
        revisions: [
            { daysAgo: 1, tags: ["performance", "wip"] },
        ],
    },
    {
        key: "discarded-title",
        title: "Discarded - Old Title Screen",
        folder: "ui",
        deleted: true,
        revisions: [
            { daysAgo: 200, tags: ["ui"] },
        ],
    },
];

export function daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export class VideoNode extends SeedNode<EvalNode> {
    private readonly rows = new Map<string, VideoRow>();

    row(key: string): VideoRow {
        const row = this.rows.get(key);

        if (!row) {
            throw new Error(`Unknown eval video: ${key}`);
        }

        return row;
    }

    protected async insert(prisma: PrismaClient): Promise<void> {
        const rows = await insertVideos(prisma, videos.map((video) => {
            return {
                title: video.title,
                folderKey: `${this.parent.folderPrefix}${video.folder}`,
                vcsWatchPaths: video.vcsWatchPaths,
                deleted: video.deleted,
                revisions: video.revisions.map((revision, revisionIndex) => {
                    return {
                        filePath: `videos/eval/${video.key}/rev_${String(revisionIndex + 1).padStart(3, "0")}.mp4`,
                        uploadedAt: daysAgo(revision.daysAgo),
                        tags: revision.tags,
                        summary: revision.summary,
                    };
                }),
            };
        }));

        for (const [position, video] of videos.entries()) {
            this.rows.set(video.key, rows[position]);
        }
    }
}
