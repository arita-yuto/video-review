import { prisma } from "@/server/lib/db";
import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { VideoReviewStorage } from "@/server/lib/storage";
import { env } from "@/server/lib/env/storage-env";
import { getUploadChunkMb } from "@/server/lib/integrations/general";
import path from "path";
import { createSession } from "@/server/lib/upload-session";
import { UploadStorageType } from "@/lib/db-types";
import Busboy from "busboy";
import { Readable } from "stream";
import { ContentfulStatusCode } from "hono/utils/http-status";

export const initRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Init upload",
        description: "Initializes an upload session and provides a pre-signed URL for uploading the video.",
        path: "/",
        requestBody: {
            required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            path: {
                                type: "string",
                                description: "The path where the drawing will be saved",
                            },
                        },
                        required: ["path"],
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Init upload",
            },
            400: {
                description: "Bad request",
            },
            401: {
                description: "Unauthorized",
            },
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "unauthorized" }, { status: 401 });
        }

        console.log("[upload.init] called");

        return new Promise<Response>((resolve) => {
            const contentType = c.req.header("content-type") || "";
            const busboy = Busboy({ headers: { "content-type": contentType } });
            const fields: { [key: string]: string } = {};
            let settled = false;

            const complete = (response: Response) => {
                if (settled) return;
                settled = true;
                resolve(response);
            };

            const fail = (err: any) => {
                console.error("[upload.init] failed", err);
                complete(c.json({ error: "Upload failed" }, { status: 500 }));
            };

            busboy.on("field", (name, val) => {
                fields[name] = val;
            });

            busboy.on('finish', async function () {
                try {
                    const title = fields["title"];
                    const folderKey = fields["folderKey"];
                    const scenePath = fields["scenePath"];
                    const vcsWatchPaths = fields["vcsWatchPaths"]
                        ? fields["vcsWatchPaths"].split(",").map(p => p.trim()).filter(Boolean)
                        : [];
                    console.log("[upload.init] fields", { title, folderKey, scenePath, vcsWatchPaths });

                    if (!title || !folderKey) {
                        complete(c.json({ error: "missing parameter" }, { status: 400 }));
                        return;
                    }

                    let nextRev = 1;
                    let video = await prisma.video.findFirst({ where: { title, folderKey } });
                    if (!video) {
                        console.log("[upload.init] create video (draft)", { title, folderKey });
                        await prisma.video.create({
                            data: {
                                title,
                                folderKey,
                                scenePath,
                                vcsWatchPaths,
                                latestRevisionNum: null,
                                /**
                                 * NOTE:
                                 * deleted = true means this video is NOT yet published.
                                 * This record is created at upload initialization time
                                 * to obtain a stable video.id for:
                                 * - thumbnail generation
                                 * - storage key resolution
                                 *
                                 * The flag will be set to false on upload finish.
                                 */
                                deleted: true,
                            },
                        });
                    } else {
                        nextRev = await prisma.$transaction(async (tx) => {
                            const latest = await tx.videoRevision.findFirst({
                                where: { videoId: video.id },
                                orderBy: { revision: "desc" },
                            });
                            return (latest?.revision ?? 0) + 1;
                        });

                        console.log("[upload.init] existing video", {
                            videoId: video.id,
                            nextRev,
                        });
                    }

                    const filenameOut = `rev_${String(nextRev).padStart(3, "0")}.mp4`;
                    const storageKey = path.join(
                        "videos",
                        folderKey,
                        title,
                        filenameOut
                    ).replace(/\\/g, "/");

                    const type = VideoReviewStorage.type();
                    const session = await createSession({
                        nextRev,
                        title,
                        folderKey,
                        scenePath,
                        vcsWatchPaths,
                        storageKey,
                        storage: type as UploadStorageType,
                    });

                    console.log("[upload.init] session created", {
                        sessionId: session.id,
                        storageKey,
                        storage: type,
                    });

                    const url = await VideoReviewStorage.uploadURL(session.id, storageKey, "video/mp4");
                    console.log("[upload.init] upload url issued");
                    // The chunk size is a property of this deployment (an upload limit in front
                    // of the server), so the clients are told rather than configured.
                    complete(c.json({ url, session, chunkSize: (await getUploadChunkMb()) * 1024 * 1024 }));
                } catch (err) {
                    fail(err);
                }
            });

            busboy.on("error", err => fail(err));

            const readable = Readable.fromWeb(c.req.raw.body as any);
            readable.on("error", err => fail(err));
            readable.pipe(busboy);
        });
    });
