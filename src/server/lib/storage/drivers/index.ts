import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { UploadStorageType } from "@prisma/client";
import { env } from "@/server/lib/env/storage-env";
import { S3Driver } from "@/server/lib/storage/drivers/s3";
import { NextCloudDriver } from "@/server/lib/storage/drivers/nextcloud";
import { LocalDriver } from "@/server/lib/storage/drivers/local";


export interface FileDriver {
    type(): string;
    directUploadFromBuffer(storageKey: string, src: Readable, contentType: string, cacheControl?: string): Promise<void>;
    directUploadFromFile(storageKey: string, src: string): Promise<void>;
    uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string>;
    fallbackURL(storageKey: string): Promise<string>;
    download(storageKey: string): Promise<Readable | string>;
    directReadStream(storageKey: string): Promise<Readable>
    hasObject(storageKey: string): Promise<boolean>;
    deleteObject(storageKey: string): Promise<boolean>;
}


export const DriversFactory = () => {
    switch (env.VIDEO_REVIEW_STORAGE) {
        case UploadStorageType.s3: {
            const s3Endpoint = env.S3_ENDPOINT;
            const s3Region = env.S3_REGION;
            const s3Bucket = env.S3_BUCKET;
            return new S3Driver(s3Endpoint, s3Region, s3Bucket);
        }
        case UploadStorageType.nextCloud: {
            const BaseURL = env.NEXTCLOUD_BASE_URL;
            const UserName = env.NEXTCLOUD_USERNAME;
            const Password = env.NEXTCLOUD_PASSWORD;
            const RootPath = env.NEXTCLOUD_ROOTDIR;
            if (!BaseURL || !UserName || !Password) {
                break;
            }
            return new NextCloudDriver(BaseURL, UserName, Password, RootPath);
        }
        case UploadStorageType.local: {
            let localBaseDirectory: string | undefined;
            const local = env.VIDEO_REVIEW_LOCAL_ROOTDIR;
            if (local && fs.existsSync(local)) {
                localBaseDirectory = local
            } else {
                console.warn(`
                            [WARN] VIDEO_REVIEW_LOCAL_ROOTDIR is not set or invalid.
                            Falling back to default directory: ./uploads
                            For production use, please configure VIDEO_REVIEW_LOCAL_ROOTDIR explicitly.
                        `);
                localBaseDirectory = path.join(process.cwd(), "uploads")
            }
            return new LocalDriver(localBaseDirectory);
        }
        default:
            return undefined;
    }
}
