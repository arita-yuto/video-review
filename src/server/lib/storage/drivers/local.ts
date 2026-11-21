import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { FileDriver } from "@/server/lib/storage/drivers";
import fs from "fs";
import path from "path";


export class LocalDriver implements FileDriver {
    readonly localBaseDirectory: string | undefined = undefined;

    constructor(localBaseDirectory: string | undefined) {
        this.localBaseDirectory = localBaseDirectory;
    }

    type(): string {
        return "local";
    }

    async hasObject(storageKey: string): Promise<boolean> {
        if(!this.localBaseDirectory) {
             return false;
        }
        const abs = path.join(this.localBaseDirectory, storageKey);
        return fs.existsSync(abs);
    }

    async objectSize(storageKey: string): Promise<number | null> {
        const fullPath = this.resolveStoragePath(storageKey);

        if (!fullPath) {
            return null;
        }

        try {
            const stats = await fs.promises.stat(fullPath);

            return stats.isFile() ? stats.size : null;
        } catch {
            return null;
        }
    }

    async directUploadFromBuffer(storageKey: string, src: Readable, contentType: string, cacheControl?: string): Promise<void> {
        console.log("[directUploadFromBuffer] called");
        console.log("[directUploadFromBuffer] storageKey =", storageKey);
        console.log("[directUploadFromBuffer] contentType =", contentType);

        const fullPath = this.resolveStoragePath(storageKey);
        console.log("[directUploadFromBuffer] resolved fullPath =", fullPath);

        if (!fullPath) {
            console.error("[directUploadFromBuffer] fullPath is null/undefined. abort.");
            return;
        }

        const dir = path.dirname(fullPath);
        console.log("[directUploadFromBuffer] mkdir dir =", dir);
        await fs.promises.mkdir(dir, { recursive: true });

        console.log("[directUploadFromBuffer] start pipeline write");

        await pipeline(
            src,
            fs.createWriteStream(fullPath)
        );

        console.log("[directUploadFromBuffer] pipeline write done");

        const exists = fs.existsSync(fullPath);
        console.log("[directUploadFromBuffer] exists after write =", exists);
    }

    async directUploadFromFile(storageKey: string, src: string): Promise<void> {
        console.log("[directUploadFromFile] called");
        console.log("[directUploadFromFile] storageKey =", storageKey);
        console.log("[directUploadFromFile] src =", src);

        const fullPath = this.resolveStoragePath(storageKey);
        console.log("[directUploadFromFile] resolved fullPath =", fullPath);

        if (!fullPath) {
            console.error("[directUploadFromFile] fullPath is null/undefined. abort.");
            return;
        }

        const dir = path.dirname(fullPath);
        console.log("[directUploadFromFile] mkdir dir =", dir);
        await fs.promises.mkdir(dir, { recursive: true });

        try {
            console.log("[directUploadFromFile] try rename:", src, "->", fullPath);
            await fs.promises.rename(src, fullPath);
            console.log("[directUploadFromFile] rename success");
        } catch (e: any) {
            console.warn("[directUploadFromFile] rename failed:", e?.code, e?.message);

            if (e?.code !== "EXDEV") {
                throw e;
            }

            console.log("[directUploadFromFile] fallback to copy+unlink");

            await pipeline(
                fs.createReadStream(src),
                fs.createWriteStream(fullPath)
            );

            await fs.promises.unlink(src);
            console.log("[directUploadFromFile] fallback copy+unlink done");
        }

        const exists = fs.existsSync(fullPath);
        console.log("[directUploadFromFile] exists after operation =", exists);
    }

    async uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string> {
        if (contentType === "image/png") {
            return `/api/v1/drawing/upload/transfer?session_id=${session_id}`
        }
        // "video/mp4"
        return "/api/v1/videos/upload/tus";
    }

    async fallbackURL(storageKey: string): Promise<string> {
        if (storageKey.includes("api/uploads/")) {
            return await Promise.resolve(`/${storageKey.replace("api/uploads/", "api/v1/media/local/")}`);
        } else {
            const abs = this.resolveStoragePath(storageKey);
            if (!abs || !fs.existsSync(abs)) {
                return Promise.reject(undefined);
            }
            const url = `/api/v1/media/local/${storageKey}`;
            return await Promise.resolve(url);
        }
    }

    async directReadStream(storageKey: string) {
        const abs = this.resolveStoragePath(storageKey);
        if (!abs || !fs.existsSync(abs)) {
            throw new Error("file is missing on server : " + abs);
        }

        return fs.createReadStream(abs);
    }

    async deleteObject(storageKey: string): Promise<boolean> {
        console.log("[deleteObject] called");
        console.log("[deleteObject] storageKey =", storageKey);

        const abs = this.resolveStoragePath(storageKey);
        console.log("[deleteObject] resolved abs path =", abs);

        if (!abs) {
            console.warn("[deleteObject] resolveStoragePath returned null/undefined");
            return false;
        }

        const existsBefore = fs.existsSync(abs);
        console.log("[deleteObject] exists before delete =", existsBefore);

        if (!existsBefore) {
            console.warn("[deleteObject] file does not exist:", abs);
            return false;
        }

        try {
            console.log("[deleteObject] fs.rmSync start");

            fs.rmSync(abs, {
                recursive: true,
                force: true,
            });

            console.log("[deleteObject] fs.rmSync done");

            const existsAfter = fs.existsSync(abs);
            console.log("[deleteObject] exists after delete =", existsAfter);

            if (existsAfter) {
                console.error("[deleteObject] delete attempted but file still exists:", abs);
            }

            return !existsAfter;
        } catch (err) {
            console.error("[deleteObject] exception while deleting:", abs);
            console.error(err);
            return false;
        }
    }

    async download(storageKey: string): Promise<Readable | string> {
        return await this.directReadStream(storageKey)
    }

    /**
     * Resolves a storageKey into an absolute filesystem path under the uploads directory.
     *
     * This function exists for two reasons:
     * 1. Backward compatibility:
     *    In early versions, some records were persisted with API-facing paths
     *    (e.g. "/api/uploads/...") instead of pure storage-relative keys.
     *    To keep those legacy records working, we strip the "/api/uploads/" prefix
     *    only when it appears at the beginning of the key.
     *
     * 2. Safety:
     *    The resolved path is strictly constrained to stay inside the uploads
     *    base directory to prevent path traversal or accidental deletion of
     *    files outside the storage root.
     *
     * Behavior:
     * - Removes a leading "/api/uploads/" prefix if present (legacy compatibility).
     * - Removes any remaining leading slashes to avoid absolute path resolution.
     * - Resolves the path relative to "<localBaseDirectory>".
     * - Returns undefined if the resolved path escapes the uploads directory.
     */
    resolveStoragePath(storageKey: string): string | undefined {
        if (!this.localBaseDirectory) {
            console.warn("[resolveStoragePath] localBaseDirectory is not set");
            return undefined;
        }

        let key = storageKey;
        if (key.startsWith("/api/uploads/")) {
            key = key.slice("/api/uploads/".length);
        }

        key = key.replace(/^[/\\]+/, "");
        const baseDir = path.join(this.localBaseDirectory);
        const resolved = path.resolve(baseDir, key);

        if (!resolved.startsWith(baseDir + path.sep)) {
            return undefined;
        }
        return resolved;
    }
}