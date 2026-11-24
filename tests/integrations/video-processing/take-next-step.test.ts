import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { JobStatus, ProcessingStepKind } from "@prisma/client";
import { takeNextStep, prisma } from "../../../integrations/video-processing/core";

const videoIds: string[] = [];

async function createVideo(title: string, latestUpdatedAt: string): Promise<string> {
    const id = randomUUID();
    await prisma().video.create({
        data: { id, title, folderKey: "take-next-step", latestUpdatedAt: new Date(latestUpdatedAt) },
    });
    videoIds.push(id);

    return id;
}

async function createRevisionWithPendingStep(videoId: string, revision: number, uploadedAt: string): Promise<string> {
    const createdRevision = await prisma().videoRevision.create({
        data: {
            videoId,
            revision,
            filePath: `take-next-step/${videoId}/${revision}.mp4`,
            uploadedAt: new Date(uploadedAt),
            processingJob: {
                create: {
                    status: JobStatus.succeeded,
                    steps: { create: { kind: ProcessingStepKind.downscaled, status: JobStatus.pending } },
                },
            },
        },
    });

    return createdRevision.id;
}

async function finishNextPendingStep(): Promise<string | undefined> {
    const step = await takeNextStep();

    if (!step) {
        return undefined;
    }

    await prisma().videoProcessingStep.update({ where: { id: step.id }, data: { status: JobStatus.succeeded } });

    return step.job.videoRevision.id;
}

describe("takeNextStep", () => {
    afterAll(async () => {
        await prisma().videoRevision.deleteMany({ where: { videoId: { in: videoIds } } });
        await prisma().video.deleteMany({ where: { id: { in: videoIds } } });
        await prisma().$disconnect();
    });

    it("redoes the most recently updated video first, and the newest revision first within a video", async () => {
        const recentVideo = await createVideo("recently updated", "2024-03-02T00:00:00Z");
        const staleVideo = await createVideo("updated earlier", "2024-02-01T00:00:00Z");

        const recentVideoOldRevision = await createRevisionWithPendingStep(recentVideo, 1, "2024-01-01T00:00:00Z");
        const staleVideoRevision = await createRevisionWithPendingStep(staleVideo, 1, "2024-02-01T00:00:00Z");
        const recentVideoNewRevision = await createRevisionWithPendingStep(recentVideo, 2, "2024-03-01T00:00:00Z");

        const taken = [await finishNextPendingStep(), await finishNextPendingStep(), await finishNextPendingStep()];

        expect(taken).toEqual([recentVideoNewRevision, recentVideoOldRevision, staleVideoRevision]);
    });

    it("does not hand out a taken step again", async () => {
        const video = await createVideo("taken once", "2024-04-02T00:00:00Z");

        const oldRevision = await createRevisionWithPendingStep(video, 1, "2024-04-01T00:00:00Z");
        await createRevisionWithPendingStep(video, 2, "2024-04-02T00:00:00Z");

        const firstTaken = await takeNextStep();
        const secondTaken = await takeNextStep();

        const firstStep = await prisma().videoProcessingStep.findUniqueOrThrow({ where: { id: firstTaken!.id } });

        expect(firstStep.status).toBe(JobStatus.running);
        expect(secondTaken?.job.videoRevision.id).toBe(oldRevision);
    });

    it("takes over a running step whose worker stopped renewing it", async () => {
        const video = await createVideo("left running", "2024-06-01T00:00:00Z");
        const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);

        const revision = await prisma().videoRevision.create({
            data: {
                videoId: video,
                revision: 1,
                filePath: `take-next-step/${video}/1.mp4`,
                uploadedAt: new Date("2024-06-01T00:00:00Z"),
                processingJob: {
                    create: {
                        status: JobStatus.succeeded,
                        steps: {
                            create: { kind: ProcessingStepKind.downscaled, status: JobStatus.running, updatedAt: tenMinutesAgo },
                        },
                    },
                },
            },
        });

        const taken = await takeNextStep();

        expect(taken?.job.videoRevision.id).toBe(revision.id);

        const takenStep = await prisma().videoProcessingStep.findUniqueOrThrow({ where: { id: taken!.id } });

        // A renewed updatedAt is what keeps the next worker from taking it again.
        expect(takenStep.updatedAt.getTime()).toBeGreaterThan(tenMinutesAgo.getTime());
    });
});
