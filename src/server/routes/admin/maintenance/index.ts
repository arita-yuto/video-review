import { PrismaTypes } from "@/lib/db-types";
import { prisma } from "@/server/lib/db";
import { VideoReviewStorage } from "@/server/lib/storage";
import { authorize, getJwtSecret, getApiSecretHash, invalidateSecret, Secrets } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";
import { hash, randomBytes } from "crypto";
import { env } from "@/lib/env";
import { formatVideoRes } from "@/server/lib/utils/format-video-res";
import { errorResponse } from "@/server/lib/openapi/error-response";

const DeleteQuerySchema = z.object({
    videoId: z.string().optional(),
    deleted: z.string().transform(v => v === "true").optional(),
});

const PurgeQuerySchema = z.object({
    videoId: z.string().optional(),
    revision: z.string().transform(v => parseInt(v)).optional(),
});

export const maintenanceRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Update video delete flag",
        description: "Update video delete flag. deleted = true means logically deleted (hidden from UI, not physically removed)",
        path: "video/delete",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: DeleteQuerySchema,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "The video has been successfully deleted.",
            },
            403: {
                description: "Forbidden",
            }
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

        const body = c.req.valid("json");
        const { videoId, deleted } = body;

        if (videoId === undefined || deleted === undefined) {
            return c.json({ error: "missing required fields" }, 400);
        }

        const video = await prisma.video.findUnique({
            where: { id: videoId },
        });

        if (!video) {
            return c.json({ error: "video not found" }, 404);
        }

        await prisma.video.update({
            where: { id: videoId },
            data: { deleted },
        });

        return c.json({ success: true, videoId: videoId }, { status: 200 });
    })
    .openapi(createRoute({
        method: "post",
        summary: "Delete actual video files and mark all related VideoRevision as deleted",
        description: "Repoints the video at its newest surviving revision, or marks it deleted when none is left.",
        path: "video/purge",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: PurgeQuerySchema,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "The video revision has been successfully deleted.",
            },
            207: {
                description: "Marked as deleted, but failed to delete actual files"
            },
            403: {
                description: "Forbidden",
            }
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

        const body = c.req.valid("json");
        const { videoId, revision } = body;

        if (videoId === undefined || revision === undefined) {
            return c.json({ error: "missing required fields" }, 400);
        }

        const whereVideoRevision: PrismaTypes.VideoRevisionWhereUniqueInput = {
            videoId_revision: { videoId, revision },
        }

        const videoRevision = await prisma.videoRevision.findUnique({
            where: whereVideoRevision,
        });

        if (!videoRevision) {
            return c.json({ error: "video not found" }, 404);
        }

        await prisma.$transaction(async (tx) => {
            // Concurrent purges on the same video would each miss the other's revision and
            // write a wrong pointer below.
            await tx.$executeRaw`SELECT id FROM "Video" WHERE id = ${videoId} FOR UPDATE`;

            await tx.videoRevision.update({
                where: { id: videoRevision.id },
                data: { deleted: true },
            });

            const newest = await tx.videoRevision.findFirst({
                where: { videoId, deleted: false },
                orderBy: { revision: "desc" },
                select: { revision: true, uploadedAt: true },
            });

            // Players and thumbnails follow latestRevisionNum, so it must never name a purged revision.
            await tx.video.update({
                where: { id: videoId },
                data: newest
                    ? { latestRevisionNum: newest.revision, latestUpdatedAt: newest.uploadedAt }
                    // The record stays: a re-upload of the same title picks its comments back up.
                    : { latestRevisionNum: null, deleted: true },
            });
        });

        try {
            const ret = await VideoReviewStorage.deleteObject(videoRevision.filePath);
            for (const res of env.RESOLUTION_PRESETS) {
                const derivedStorageKey = formatVideoRes(videoRevision.filePath, res);
                await VideoReviewStorage.deleteObject(derivedStorageKey);
            }

            if (!ret) {
                throw new Error("delete failed");
            }
        } catch {
            return c.json({
                warning: "VideoRevision marked as deleted, but failed to delete actual files",
                videoId,
                revision,
            }, 207)
        }

        return c.json({ success: true, videoId, revision }, { status: 200 });
    })
    .openapi(createRoute({
        method: "post",
        summary: "rotate token",
        path: "/api-token/rotate",
        responses: {
            200: {
                description: "rotate api token",
                content: {
                    "application/json": {
                        schema: z.object({ token: z.string() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("Auth configuration is missing"),
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403 | 500);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        const apiToken = randomBytes(32).toString("hex");
        const tokenHash = hash("sha256", apiToken);
        await prisma.systemSecret.upsert({
            where: { key: "API_TOKEN" },
            update: { valueHash: tokenHash },
            create: { key: "API_TOKEN", valueHash: tokenHash },
        });
        invalidateSecret(Secrets.API);

        return c.json({ token: apiToken }, 200);
    })
    .openapi(createRoute({
        method: "get",
        summary: "api token status",
        path: "/api-token/status",
        responses: {
            200: {
                description: "whether an api token is configured",
                content: {
                    "application/json": {
                        schema: z.object({ configured: z.boolean() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        const configured = (await getApiSecretHash()) !== undefined;
        return c.json({ configured }, 200);
    })
    .openapi(createRoute({
        method: "get",
        summary: "check status",
        path: "/status",
        responses: {
            200: {
                description: "check initialized",
                content: {
                    "application/json": {
                        schema: z.object({
                            hasAdmin: z.boolean(),
                            hasJwt: z.boolean(),
                            initialized: z.boolean(),
                        }),
                    },
                },
            },
            500: errorResponse("Unknown error"),
        },
    }), async (c) => {
        try {
            const hasAdmin = await prisma.user.count({ where: { role: "admin" } }) > 0;
            const hasJwt = await getJwtSecret() !== undefined
            return c.json({
                hasAdmin,
                hasJwt,
                initialized: hasAdmin && hasJwt,
            }, 200);
        } catch (e) {
            return c.json({ error: e instanceof ServerError ? e.message : "unknown error" }, 500);
        }
    });
