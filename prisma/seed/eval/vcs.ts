import type { PrismaClient } from "@prisma/client";
import { insertVcs } from "../insert";
import { SeedNode } from "../seed-node";
import { daysAgo, type VideoNode } from "./video";

// The code changes linked to a revision: what changed since the previous one.
const pullRequests = [
    { video: "boss-dragon", revision: 2, number: 101, title: "Fix dragon tail collision", description: "Tail sweep now uses a capsule collider.", author: "kita", labels: ["bug"], files: ["Assets/Boss/Dragon/DragonTail.cs"], mergedDaysAgo: 5 },
    { video: "cutscene-opening", revision: 2, number: 98, title: "Rework opening camera path", author: "bocchi", labels: ["cutscene"], files: ["Assets/Cutscenes/Opening/CameraPath.asset"], mergedDaysAgo: 12 },
    { video: "ui-inventory", revision: 1, number: 104, title: "Inventory grid layout fix", author: "nijika", labels: ["ui", "bug"], files: ["Assets/UI/Inventory/InventoryGrid.cs"], mergedDaysAgo: 6 },
    { video: "shader-water", revision: 1, number: 106, title: "Add screen-space water reflections", author: "ryo", labels: ["graphics"], files: ["Assets/Shaders/Water.shader", "Assets/Shaders/Reflection.hlsl"], mergedDaysAgo: 3 },
    { video: "ai-patrol", revision: 1, number: 99, title: "Patrol state machine", author: "ryo", labels: ["ai"], files: ["Assets/AI/Patrol/PatrolState.cs"], mergedDaysAgo: 16 },
    { video: "level-forest", revision: 2, number: 90, title: "Forest lighting pass", author: "nijika", labels: ["level"], files: ["Assets/Levels/Forest/Lighting.asset"], mergedDaysAgo: 42 },
    { video: "perf-crowd", revision: 1, number: 107, title: "Update README badges", author: "bocchi", files: ["README.md"], mergedDaysAgo: 2 },
];

const commits = [
    { video: "boss-dragon", revision: 2, hash: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678", message: "Tweak boss camera shake amplitude", author: "ryo", files: ["Assets/Camera/BossCamera.cs"], committedDaysAgo: 4 },
    { video: "ai-patrol", revision: 1, hash: "b2c3d4e5f60718293a4b5c6d7e8f90123456789a", message: "Fix crouch detection distance", author: "kita", files: ["Assets/AI/Perception.cs"], committedDaysAgo: 15 },
    { video: "level-forest", revision: 2, hash: "c3d4e5f60718293a4b5c6d7e8f90123456789ab1", message: "Widen forest path near the bridge", author: "nijika", files: ["Assets/Levels/Forest/Path.prefab"], committedDaysAgo: 41 },
    { video: "perf-crowd", revision: 1, hash: "d4e5f60718293a4b5c6d7e8f90123456789ab1c2", message: "Batch crowd renderers", author: "ryo", files: ["Assets/Crowd/CrowdRenderer.cs"], committedDaysAgo: 2 },
];

// The stored summary of a revision's code changes.
const summaries = [
    { video: "boss-dragon", revision: 2, text: "Tail collision fix and a camera shake tweak for the dragon boss." },
    { video: "cutscene-opening", revision: 2, text: "The opening camera path was reworked." },
];

export class VcsNode extends SeedNode<VideoNode> {
    protected async insert(prisma: PrismaClient): Promise<void> {
        const dataset = this.parent.parent;
        const linked = new Map<string, { video: string; revision: number }>();

        for (const change of [...pullRequests, ...commits]) {
            linked.set(`${change.video}#${change.revision}`, { video: change.video, revision: change.revision });
        }

        for (const { video, revision } of linked.values()) {
            const row = this.parent.row(video);
            const uploadedAt = row.revisions[revision - 1].uploadedAt;
            const previous = row.revisions[revision - 2];
            const isLinked = (entry: { video: string; revision: number }) => {
                return entry.video === video && entry.revision === revision;
            };

            await insertVcs(prisma, {
                repoName: dataset.vcsRepoName,
                vcsConfigId: dataset.vcsConfigId,
                revisionId: row.revisions[revision - 1].id,
                // The changes since the previous revision, or the 30 days before a first revision.
                rangeFrom: previous ? previous.uploadedAt : new Date(uploadedAt.getTime() - 30 * 24 * 60 * 60 * 1000),
                rangeTo: uploadedAt,
                vcsWatchPaths: row.vcsWatchPaths,
                summary: summaries.find(isLinked)?.text,
                pullRequests: pullRequests.filter(isLinked).map((pullRequest) => {
                    return { ...pullRequest, mergedAt: daysAgo(pullRequest.mergedDaysAgo) };
                }),
                commits: commits.filter(isLinked).map((commit) => {
                    return { ...commit, committedAt: daysAgo(commit.committedDaysAgo) };
                }),
            });
        }
    }
}
