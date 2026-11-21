import { NextResponse } from "next/server";
import { Readable } from "stream";
import { DriversFactory, FileDriver } from "@/server/lib/storage/drivers";

import "server-only"

export class FileStorage {

    readonly fileDriver: FileDriver | undefined;

    constructor() {
        this.fileDriver = DriversFactory();
    }

    getDriver(): FileDriver | undefined {
        return this.fileDriver;
    }

    type(): string {
        if (!this.fileDriver) {
            throw new Error("File driver is not initialized");
        }
        return this.fileDriver.type();
    }

    directUploadFromBuffer(storageKey: string, src: Readable, contentType: string, cacheControl?: string): Promise<void> {
        if (!this.fileDriver) {
            throw new Error("File driver is not initialized");
        }
        return this.fileDriver.directUploadFromBuffer(storageKey, src, contentType, cacheControl);
    }

    directUploadFromFile(storageKey: string, src: string): Promise<void> {
        if (!this.fileDriver) {
            throw new Error("File driver is not initialized");
        }
        return this.fileDriver.directUploadFromFile(storageKey, src);
    }

    uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string> {
        if (!this.fileDriver) {
            throw new Error("File driver is not initialized");
        }
        return this.fileDriver.uploadURL(session_id, storageKey, contentType);
    }

    fallbackURL(storageKey: string): Promise<string> {
        if (!this.fileDriver) {
            throw new Error("File driver is not initialized");
        }
        return this.fileDriver.fallbackURL(storageKey);
    }

    directReadStream(storageKey: string): Promise<Readable> {
        if (!this.fileDriver) {
            throw new Error("File driver is not initialized");
        }
        return this.fileDriver.directReadStream(storageKey);
    }

    async download(storageKey: string): Promise<NextResponse> {
        if (!this.fileDriver) {
            throw new Error("File driver is not initialized");
        }
        const body = await this.fileDriver.download(storageKey);
        
        if (typeof body === "string") {
            return NextResponse.redirect(body, 302);
        } else {
            return new NextResponse(body as any, {
                headers: {
                    "Content-Type": "application/octet-stream",
                },
            });
        }
    }

    hasObject(storageKey: string): Promise<boolean> {
        if (!this.fileDriver) {
            throw new Error("File driver is not initialized");
        }
        return this.fileDriver.hasObject(storageKey);
    }

    objectSize(storageKey: string): Promise<number | null> {
        if (!this.fileDriver) {
            throw new Error("File driver is not initialized");
        }
        return this.fileDriver.objectSize(storageKey);
    }

    deleteObject(storageKey: string): Promise<boolean> {
        if (!this.fileDriver) {
            throw new Error("File driver is not initialized");
        }
        return this.fileDriver.deleteObject(storageKey);
    }
}


export const VideoReviewStorage = new FileStorage();
