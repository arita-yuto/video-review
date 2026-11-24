import { isStopRequested, processNext, prisma, requestStop } from "./core.js";
import { JobStatus } from "@prisma/client";

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function shutdownProcessingResources(): Promise<void> {
    await prisma().$disconnect();
}

async function runResidentLoop(): Promise<void> {
    const intervalMs = 10_000;

    console.log(`video-processing worker started: intervalMs=${intervalMs}`);

    while (!isStopRequested()) {
        // Stays null when processNext throws, so a repeating error waits like an empty queue.
        let status: JobStatus | null = null;

        try {
            status = await processNext();
        } catch (error) {
            console.error("Error processing the next video or step:", error);
        }

        if (status === null && !isStopRequested()) {
            await sleep(intervalMs);
        }
    }
}

async function runOnceLoop(): Promise<void> {
    let processedCounter = 0;
    let failureCounter = 0;

    console.log("video-processing worker started: once");

    while (!isStopRequested()) {
        const status = await processNext();

        // Work that stop interrupted counts as neither processed nor failed.
        if (status === null || status === JobStatus.pending) {
            break;
        }

        processedCounter += 1;

        if (status === JobStatus.failed) {
            failureCounter += 1;
        }
    }

    console.log(`video-processing once: processed=${processedCounter}, failure=${failureCounter}`);
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
