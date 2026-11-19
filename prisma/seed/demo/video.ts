import type { PrismaClient } from "@prisma/client";
import { insertVideos, type VideoData, type VideoRow } from "../insert";

const batches = [
    { titlePrefix: "Gameplay Capture", count: 40, scenePercent: 80, deleted: false },
    { titlePrefix: "Feature Review", count: 160, scenePercent: 50, deleted: false },
    { titlePrefix: "Archived Playtest", count: 250, scenePercent: 20, deleted: false },
    { titlePrefix: "Discarded", count: 50, scenePercent: 10, deleted: true },
];

const folders = [
    "01_prototype",
    "02_core_loop",
    "03_battle",
    "04_boss",
    "05_cutscene",
    "06_ui",
    "07_tutorial",
    "08_event",
    "09_debug",
    "10_release_candidate",
];

// Picks the same indexes on every run. A multiplier coprime to 100 spreads them evenly over the folders.
export function picked(index: number, percent: number, multiplier: number): boolean {
    return (index * multiplier) % 100 < percent;
}

export type DemoVideo = { index: number; row: VideoRow };

export async function insertDemoVideos(prisma: PrismaClient, folderPrefix: string): Promise<DemoVideo[]> {
    const indexes: number[] = [];
    const definitions: VideoData[] = [];

    for (const batch of batches) {
        // index restarts in every batch, so picked() selects the same positions in each.
        for (let index = 0; index < batch.count; index++) {
            indexes.push(index);

            definitions.push({
                title: `${batch.titlePrefix} #${String(index + 1).padStart(3, "0")}`,
                folderKey: `${folderPrefix}${folders[index % folders.length]}`,
                scenePath: picked(index, batch.scenePercent, 13) ? "videos/UnitySample/UnityDemo/rev_001.mp4" : undefined,
                deleted: batch.deleted,
                revisions: [{ filePath: "videos/demo/rev_001.mp4" }],
            });
        }
    }

    const rows = await insertVideos(prisma, definitions);

    return rows.map((row, position) => {
        return { index: indexes[position], row };
    });
}
