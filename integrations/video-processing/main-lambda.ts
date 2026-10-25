import { processVideo, prisma } from "./core.js";
import { JobStatus } from "@prisma/client";

type S3RecordLike = {
    s3?: {
        object?: {
            key?: string;
        };
    };
};

type S3EventLike = {
    Records?: S3RecordLike[];
};

type ProcessSummary = {
    processed: number;
    skipped: number;
    failed: number;
};

export async function handler(event: S3EventLike): Promise<ProcessSummary> {
    const records = event.Records ?? [];
    const summary: ProcessSummary = { processed: 0, skipped: 0, failed: 0 };

    try {
        for (const record of records) {
            const rawKey = record.s3?.object?.key;
            if (!rawKey) {
                summary.skipped += 1;
                continue;
            }

            const storageKey = decodeURIComponent(rawKey.replace(/\+/g, "%20"));
            const videoRev = await prisma().videoRevision.findFirst({
                where: {
                    filePath: storageKey,
                    deleted: false,
                    video: { deleted: false },
                },
                include: {
                    processingJob: true,
                },
            });

            if (!videoRev) {
                console.warn(`video-processing lambda skip: revision not found key=${storageKey}`);
                summary.skipped += 1;
                continue;
            }

            if (videoRev.processingJob) {
                console.log(`video-processing lambda skip: already handled revision=${videoRev.id}`);
                summary.skipped += 1;
                continue;
            }

            try {
                const status = await processVideo(storageKey, videoRev.videoId, videoRev.id);
                if (status === JobStatus.succeeded) {
                    summary.processed += 1;
                } else {
                    summary.failed += 1;
                }
            } catch (error) {
                console.error(`video-processing lambda failed: revision=${videoRev.id}`, error);
                summary.failed += 1;
            }
        }
    } catch (error) {
        console.error("video-processing lambda error:", error);
        throw error;
    }

    console.log(
        `video-processing lambda completed: processed=${summary.processed} failed=${summary.failed} skipped=${summary.skipped}`,
    );
    return summary;
}
