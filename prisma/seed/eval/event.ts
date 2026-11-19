import type { PrismaClient } from "@prisma/client";
import { insertEvents } from "../insert";
import type { EvalVideos } from "./video";

const events = [
    { video: "boss-dragon", revision: 2, kind: "shot_type", startMs: 0, endMs: 8000, data: "wide-shot" },
    { video: "boss-dragon", revision: 2, kind: "detected_text", startMs: 30000, endMs: 32000, data: "PHASE 2" },
    { video: "tutorial-movement", revision: 1, kind: "detected_text", startMs: 7000, endMs: 9000, data: "PRESS A TO JUMP" },
    { video: "cutscene-opening", revision: 2, kind: "transcription", startMs: 1000, endMs: 4500, data: "Welcome to the kingdom of Aster" },
    { video: "cutscene-opening", revision: 2, kind: "shot_type", startMs: 0, endMs: 12000, data: "establishing-shot" },
    { video: "loc-japanese-menu", revision: 1, kind: "detected_text", startMs: 2000, endMs: 4000, data: "はじめから" },
];

export async function insertEvalEvents(prisma: PrismaClient, videos: EvalVideos): Promise<void> {
    const eventCounts = new Map<string, number>();

    await insertEvents(prisma, events.map((event) => {
        const revisionId = videos.row(event.video).revisions[event.revision - 1].id;
        // seq is the event's position among the events of its revision.
        const seq = eventCounts.get(revisionId) ?? 0;

        eventCounts.set(revisionId, seq + 1);

        return {
            revisionId,
            kind: event.kind,
            startMs: event.startMs,
            endMs: event.endMs,
            data: event.data,
            seq,
        };
    }));
}
