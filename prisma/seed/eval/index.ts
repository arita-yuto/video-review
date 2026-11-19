import type { PrismaClient } from "@prisma/client";
import { deleteVideos } from "../insert";
import type { SeedUsers } from "../user";
import { insertEvalComments } from "./comment";
import { insertEvalEvents } from "./event";
import { insertEvalVcs } from "./vcs";
import { insertEvalVideos } from "./video";

export const EVAL_FOLDER_PREFIX = "eval/";

// Deterministic dataset for checking that natural-language search returns the intended videos.
// tests/smoke/mcp-eval.ts holds the questions built on this data.
export async function seedEval(prisma: PrismaClient, users: SeedUsers): Promise<void> {
    await deleteVideos(prisma, EVAL_FOLDER_PREFIX);

    const videos = await insertEvalVideos(prisma, EVAL_FOLDER_PREFIX);

    await insertEvalComments(prisma, videos, users);
    await insertEvalEvents(prisma, videos);
    await insertEvalVcs(prisma, videos);
}
