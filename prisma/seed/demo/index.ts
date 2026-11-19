import type { PrismaClient } from "@prisma/client";
import { deleteVideos } from "../insert";
import type { SeedUsers } from "../user";
import { insertDemoComments } from "./comment";
import { insertDemoEvents } from "./event";
import { insertDemoVideos } from "./video";

export async function seedDemo(prisma: PrismaClient, users: SeedUsers): Promise<void> {
    const folderPrefix = "demo/";

    await deleteVideos(prisma, folderPrefix);

    const videos = await insertDemoVideos(prisma, folderPrefix);

    await insertDemoComments(prisma, videos, users);
    await insertDemoEvents(prisma, videos);
}
