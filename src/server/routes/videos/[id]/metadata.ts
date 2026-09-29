import { prisma } from "@/server/lib/db";
import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { z } from "zod";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { randomUUID } from "crypto";
import { VideoRevisionSchema } from "@/schema/zod";

const annotateBody = z.object({
    tags: z.string()
        .transform((x) => x.split(",").map((tag) => tag.trim()).filter((tag) => tag.length > 0))
        .optional(),
    summary: z.string().optional(),
});

const uploadBody = z.object({
    events: z.array(
        z.object({
            kind: z.string().min(1),
            startMs: z.number().int().nonnegative(),
            endMs: z.number().int().nonnegative(),
            data: z.string().trim().min(1),
            seq: z.number().int().nonnegative().optional(),
            links: z.array(
                z.object({
                    label: z.string().optional(),
                    url: z.string().url(),
                })
            ).default([]),
        })
    ).default([]),
}).superRefine((value, ctx) => {
    value.events.forEach((event, idx) => {
        if (event.endMs < event.startMs) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["events", idx, "endMs"],
                message: "endMs must be greater than or equal to startMs",
            });
        }
    });
});

export const metaDataRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "",
        description: "",
        path: "/annotate",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: annotateBody,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Revision annotated",
                content: {
                    "application/json": {
                        schema: z.object({ videoRevision: VideoRevisionSchema }),
                    },
                },
            },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
            500: { description: "" }
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        const id = c.req.param("id");
        const body = c.req.valid("json");
        const { tags, summary } = body;

        const videoRev = await prisma.videoRevision.findUnique({
            where: { id },
            select: { id: true, videoId: true },
        });

        if (!videoRev) {
            throw new ServerError("Video revision not found", 404);
        }

        const updatedVideoRev = await prisma.videoRevision.update({
            where: { id: videoRev.id },
            // Callers send only the field they edit; leave the other one untouched.
            data: {
                ...(summary !== undefined ? { summary } : {}),
                ...(tags !== undefined ? { tags } : {}),
            },
        });
        return c.json({ videoRevision: updatedVideoRev }, 200);
    })
    .openapi(createRoute({
        method: "put",
        summary: "",
        description: "",
        path: "/upload",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: uploadBody,
                    },
                },
            },
        },
        responses: {
            200: { description: "" },
            401: { description: "Unauthorized" },
            403: { description: "Forbidden" },
            400: { description: "Missing parameters" }
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

        const id = c.req.param("id");
        const body = c.req.valid("json");
        const { events } = body;

        const revision = await prisma.videoRevision.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!revision) {
            return c.json({ error: "video revision not found" }, 404);
        }

        const byKind = new Map<string, typeof events>();
        for (const event of events) {
            const list = byKind.get(event.kind) ?? [];
            list.push(event);
            byKind.set(event.kind, list);
        }

        let inserted = 0;

        await prisma.$transaction(async (tx) => {
            for (const [kindLabel, kindEvents] of byKind) {
                const eventKind = await tx.videoEventKind.upsert({
                    where: { label: kindLabel },
                    update: {},
                    create: { label: kindLabel },
                });

                await tx.videoEvent.deleteMany({
                    where: {
                        videoRevisionId: revision.id,
                        kindId: eventKind.id,
                    },
                });

                if (kindEvents.length === 0) continue;

                await tx.videoEvent.createMany({
                    data: kindEvents.map((event, idx) => ({
                        id: randomUUID(),
                        videoRevisionId: revision.id,
                        kindId: eventKind.id,
                        startMs: event.startMs,
                        endMs: event.endMs,
                        data: event.data,
                        seq: event.seq ?? idx,
                        links: event.links,
                    })),
                });

                inserted += kindEvents.length;
            }
        });

        return c.json({ ok: true, inserted });
    });
