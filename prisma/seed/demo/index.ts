import type { PrismaClient } from "@prisma/client";
import { deleteVideos } from "../insert";
import { SeedNode } from "../seed-node";
import type { RootNode } from "../user";
import { CommentNode } from "./comment";
import { EventNode } from "./event";
import { VideoNode } from "./video";

export class DemoNode extends SeedNode<RootNode> {
    readonly folderPrefix = "demo/";

    constructor(parent: RootNode) {
        super(parent);

        const video = this.add(new VideoNode(this));

        video.add(new CommentNode(video));
        video.add(new EventNode(video));
    }

    protected async insert(prisma: PrismaClient): Promise<void> {
        await deleteVideos(prisma, this.folderPrefix);
    }
}
