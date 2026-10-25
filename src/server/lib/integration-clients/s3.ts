import { S3Client } from "@aws-sdk/client-s3";
import { UploadStorageType } from "@prisma/client";
import { env } from "@/server/lib/env";

import "server-only"

function createS3Client(): S3Client | null {
    if (env.VIDEO_REVIEW_STORAGE !== UploadStorageType.s3) {
        return null;
    }

    let s3: S3Client | null = null;
    if (env.S3_ENDPOINT) {
        s3 = new S3Client({
            endpoint: env.S3_ENDPOINT,
            forcePathStyle: true,
            region: env.S3_REGION,
            requestChecksumCalculation: "WHEN_SUPPORTED",
            responseChecksumValidation: "WHEN_SUPPORTED",
        });
    } else {
        s3 = new S3Client({
            region: env.S3_REGION,
        });
    }
    return s3;
}

export const s3Client = createS3Client();
