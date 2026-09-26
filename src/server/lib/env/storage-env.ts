import { typeEnv } from "@/lib/env/helpers";
import { UploadStorageType } from "@prisma/client";

export const env = {
    VIDEO_REVIEW_STORAGE: typeEnv<UploadStorageType>(process.env.VIDEO_REVIEW_STORAGE, UploadStorageType.local),
    VIDEO_REVIEW_LOCAL_ROOTDIR: process.env.VIDEO_REVIEW_LOCAL_ROOTDIR,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    S3_LOCALSTACK_ENDPOINT: process.env.S3_LOCALSTACK_ENDPOINT === "" ? undefined : process.env.S3_LOCALSTACK_ENDPOINT,
    NEXTCLOUD_BASE_URL: process.env.VIDEO_REVIEW_NEXTCLOUD_BASE_URL,
    NEXTCLOUD_USERNAME: process.env.VIDEO_REVIEW_NEXTCLOUD_USERNAME,
    NEXTCLOUD_PASSWORD: process.env.VIDEO_REVIEW_NEXTCLOUD_PASSWORD,
    NEXTCLOUD_ROOTDIR: process.env.VIDEO_REVIEW_NEXTCLOUD_ROOTDIR,
} as const;
