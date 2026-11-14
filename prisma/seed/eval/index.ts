import type { PrismaClient } from "@prisma/client";
import { deleteVcsCache, deleteVideos, insertVcsConfig } from "../insert";
import { SeedNode } from "../seed-node";
import type { RootNode } from "../user";
import { CommentNode } from "./comment";
import { EventNode } from "./event";
import { VcsNode } from "./vcs";
import { VideoNode } from "./video";

export const EVAL_FOLDER_PREFIX = "eval/";

// Deterministic dataset for checking that natural-language search returns the intended videos.
// tests/smoke/mcp-eval.ts holds the questions built on this data.
export class EvalNode extends SeedNode<RootNode> {
    readonly folderPrefix = EVAL_FOLDER_PREFIX;
    readonly vcsRepoName = "eval/sample-game";
    private configId: string | undefined;

    constructor(parent: RootNode) {
        super(parent);

        const video = this.add(new VideoNode(this));

        video.add(new CommentNode(video));
        video.add(new EventNode(video));
        video.add(new VcsNode(video));
    }

    get vcsConfigId(): string {
        if (!this.configId) {
            throw new Error("The eval VCS config is read before the eval node is inserted");
        }

        return this.configId;
    }

    protected async insert(prisma: PrismaClient): Promise<void> {
        await deleteVideos(prisma, this.folderPrefix);
        await deleteVcsCache(prisma, this.vcsRepoName);

        this.configId = await insertVcsConfig(prisma, this.vcsRepoName);
    }
}
