import { takeNextStep, isStopRequested, processStep, processVideo, prisma, requestStop } from "./core.js";
import { JobStatus, VideoRevision } from "@prisma/client";

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchUnprocessedVideoRevisions(limit: number): Promise<VideoRevision[]> {
    return prisma().videoRevision.findMany({
        where: {
            deleted: false,
            video: { deleted: false },
            processingJob: null,
        },
        orderBy: [{ uploadedAt: "asc" }],
        take: limit,
    });
}

async function shutdownProcessingResources(): Promise<void> {
    await prisma().$disconnect();
}

async function runResidentLoop(): Promise<void> {
    const batchSize = 10;
    const intervalMs = 10_000;

    console.log(
        `video-processing worker started: intervalMs=${intervalMs}, batchSize=${batchSize}`,
    );

    while (!isStopRequested()) {
        const pendingVideos = await fetchUnprocessedVideoRevisions(batchSize);
        if (pendingVideos.length === 0) {
            // One per cycle: each step downloads its whole source, and new uploads must not wait behind them.
            try {
                const step = await takeNextStep();
                if (step) {
                    await processStep(step);
                }
            } catch (error) {
                console.error("Error processing a step:", error);
            }
        } else {
            let successCounter = 0;
            let failureCounter = 0;
            console.log(`Found ${pendingVideos.length} pending videos, processing...`);
            for (const videoRev of pendingVideos) {
                if (isStopRequested()) {
                    break;
                }

                try {
                    const status = await processVideo(videoRev.filePath, videoRev.videoId, videoRev.id);
                    if (status === JobStatus.succeeded) {
                        successCounter += 1;
                    } else {
                        failureCounter += 1;
                    }
                } catch (error) {
                    console.error(`Error processing videoRevId ${videoRev.id}:`, error);
                }
            }
            console.log(`video-processing cycle: processed=${pendingVideos.length} videos, success=${successCounter}, failure=${failureCounter}`);
        }

        if (!isStopRequested()) {
            await sleep(intervalMs);
        }
    }
}

async function runOnceLoop(): Promise<void> {
    let processedCounter = 0;
    let failureCounter = 0;

    console.log("video-processing worker started: once");

    while (!isStopRequested()) {
        const step = await takeNextStep();
        if (!step) {
            break;
        }

        const status = await processStep(step);

        // A step put back to pending on stop counts as neither processed nor failed.
        if (status === JobStatus.pending) {
            break;
        }

        processedCounter += 1;

        if (status === JobStatus.failed) {
            failureCounter += 1;
        }
    }

    console.log(`video-processing once: processed=${processedCounter} steps, failure=${failureCounter}`);
}

export async function runLocalWorker(): Promise<void> {
    const onSignal = (signal: string) => {
        console.log(`video-processing worker received ${signal}; shutting down`);
        requestStop();
    };

    process.on("SIGINT", () => onSignal("SIGINT"));
    process.on("SIGTERM", () => onSignal("SIGTERM"));

    if (process.argv.includes("--once")) {
        await runOnceLoop();
    } else {
        await runResidentLoop();
    }

    await shutdownProcessingResources();
    console.log("video-processing worker stopped");
}

runLocalWorker().catch(async (error) => {
    console.error("video-processing worker crashed", error);
    await shutdownProcessingResources();
    process.exit(1);
});
