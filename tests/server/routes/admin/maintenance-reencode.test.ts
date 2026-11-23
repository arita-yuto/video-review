import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { JobStatus, ProcessingStepKind } from "@prisma/client";

import { prisma } from "@/server/lib/db";
import { handleServerError } from "@/server/lib/server-error";

vi.mock("@/server/lib/token", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/server/lib/token")>();
    return { ...actual, authorize: vi.fn() };
});

import { authorize } from "@/server/lib/token";
import { maintenanceRouter } from "@/server/routes/admin/maintenance";

const app = new OpenAPIHono();
app.route("/maintenance", maintenanceRouter);
app.onError(handleServerError);

const videoIds: string[] = [];

type StepSeed = { kind: ProcessingStepKind; status: JobStatus; error?: string };

async function createVideo(title: string): Promise<string> {
    const id = randomUUID();

    // An old latestUpdatedAt keeps these steps behind the ones take-next-step.test.ts expects to take.
    await prisma.video.create({
        data: { id, title, folderKey: "maintenance-reencode", latestUpdatedAt: new Date("2000-01-01T00:00:00Z") },
    });
    videoIds.push(id);

    return id;
}

async function createRevisionWithSteps(videoId: string, revision: number, steps: StepSeed[]): Promise<void> {
    await prisma.videoRevision.create({
        data: {
            videoId,
            revision,
            filePath: `maintenance-reencode/${videoId}/${revision}.mp4`,
            uploadedAt: new Date("2000-01-01T00:00:00Z"),
            processingJob: {
                create: {
                    status: JobStatus.succeeded,
                    steps: { create: steps },
                },
            },
        },
    });
}

function findStep(videoId: string, revision: number, kind: ProcessingStepKind) {
    return prisma.videoProcessingStep.findFirstOrThrow({
        where: { kind, job: { videoRevision: { videoId, revision } } },
    });
}

function reencodeRequest(videoId: string) {
    return app.request("http://localhost/maintenance/video/reencode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoId }),
    });
}

describe("POST /video/reencode", () => {
    beforeEach(() => {
        vi.mocked(authorize).mockResolvedValue({ type: "api-token", role: "admin" } as never);
    });

    afterAll(async () => {
        await prisma.videoRevision.deleteMany({ where: { videoId: { in: videoIds } } });
        await prisma.video.deleteMany({ where: { id: { in: videoIds } } });
        await prisma.$disconnect();
    });

    it("leaves a step a worker is running alone", async () => {
        const video = await createVideo("being encoded");

        await createRevisionWithSteps(video, 1, [{ kind: ProcessingStepKind.downscaled, status: JobStatus.running }]);
        await createRevisionWithSteps(video, 2, [{ kind: ProcessingStepKind.downscaled, status: JobStatus.succeeded }]);

        const res = await reencodeRequest(video);

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ requeued: 1 });

        const runningStep = await findStep(video, 1, ProcessingStepKind.downscaled);
        const finishedStep = await findStep(video, 2, ProcessingStepKind.downscaled);

        expect(runningStep.status).toBe(JobStatus.running);
        expect(finishedStep.status).toBe(JobStatus.pending);
    });

    it("requeues only the downscaled steps of the requested video", async () => {
        const requestedVideo = await createVideo("requested");
        const otherVideo = await createVideo("not requested");

        await createRevisionWithSteps(requestedVideo, 1, [
            { kind: ProcessingStepKind.downscaled, status: JobStatus.failed, error: "boom" },
            { kind: ProcessingStepKind.thumbnail, status: JobStatus.succeeded },
            { kind: ProcessingStepKind.filmstrip, status: JobStatus.succeeded },
        ]);
        await createRevisionWithSteps(otherVideo, 1, [{ kind: ProcessingStepKind.downscaled, status: JobStatus.succeeded }]);

        const res = await reencodeRequest(requestedVideo);

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ requeued: 1 });

        const downscaled = await findStep(requestedVideo, 1, ProcessingStepKind.downscaled);
        const thumbnail = await findStep(requestedVideo, 1, ProcessingStepKind.thumbnail);
        const filmstrip = await findStep(requestedVideo, 1, ProcessingStepKind.filmstrip);
        const otherDownscaled = await findStep(otherVideo, 1, ProcessingStepKind.downscaled);

        expect(downscaled.status).toBe(JobStatus.pending);
        expect(downscaled.error).toBeNull();
        expect(thumbnail.status).toBe(JobStatus.succeeded);
        expect(filmstrip.status).toBe(JobStatus.succeeded);
        expect(otherDownscaled.status).toBe(JobStatus.succeeded);
    });
});
