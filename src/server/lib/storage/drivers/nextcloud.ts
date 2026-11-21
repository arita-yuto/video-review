import { Buffer } from "node:buffer";
import { Readable } from "stream";
import { FileDriver } from "@/server/lib/storage/drivers";
import fs, { createReadStream } from "fs";
import { lookup } from "mime-types";

export class NextCloudDriver implements FileDriver {
    readonly davBaseURL: string;
    /** Nextcloud assembles chunked uploads under this collection, not under the files tree. */
    readonly davUploadsURL: string;
    readonly authHeader: string;
    readonly rootPath: string;

    constructor(baseURL: string, userName: string, password: string, rootPath: string = "video-review") {
        this.davBaseURL = `${baseURL}/remote.php/dav/files/${encodeURIComponent(userName)}`;
        this.davUploadsURL = `${baseURL}/remote.php/dav/uploads/${encodeURIComponent(userName)}`;
        const credentials = Buffer.from(`${userName}:${password}`).toString("base64");
        this.authHeader = `Basic ${credentials}`;
        this.rootPath = rootPath;
        this.createDirectory(rootPath).catch((err) => {
            console.error("Failed to ensure root dir:", err);
        });
    }

    type(): string {
        return "nextCloud";
    }
    
    async hasObject(path: string): Promise<boolean> {
        const res = await fetch(this.pathUnderRoot(path), {
            method: "GET",
            headers: this.getHeaders(),
        });
        return res.status === 200;
    }

    async objectSize(storageKey: string): Promise<number | null> {
        const res = await fetch(this.pathUnderRoot(storageKey), {
            method: "HEAD",
            headers: this.getHeaders(),
        });

        if (res.status === 404) {
            return null;
        }

        const contentLength = res.headers.get("Content-Length");

        if (res.status !== 200 || contentLength === null) {
            throw new Error(`Nextcloud objectSize failed: ${res.status}`);
        }

        return Number(contentLength);
    }

    async directUploadFromBuffer(storageKey: string, src: Readable, contentType: string, cacheControl?: string): Promise<void> {
        const pathWithRoot = `${this.rootPath}/${storageKey}`;
        const pathSegments = pathWithRoot.split("/");
        for (let i = 0; i < pathSegments.length - 1; i++) {
            const dirPath = pathSegments.slice(0, i + 1).join("/");
            await this.createDirectory(dirPath);
        }

        const url = this.pathUnderRoot(storageKey);
        const chunks: Buffer[] = [];
        for await (const chunk of src) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        const res = await fetch(url, {
            method: "PUT",
            headers: this.getHeaders(),
            body: buffer,
        });

        if (!res.ok) {
            throw new Error(`PUT failed: ${res.status}`);
        }
    }

    async directUploadFromFile(storageKey: string, src: string): Promise<void> {
        await this.directUploadFromBuffer(
            storageKey,
            createReadStream(src),
            lookup(src) || "application/octet-stream");

        if (fs.existsSync(src)) {
            fs.rmSync(src);
        }
    }

    async uploadURL(session_id: string, storageKey: string, contentType: string): Promise<string> {
        if (contentType === "image/png") {
            return `/api/v1/drawing/upload/transfer?session_id=${session_id}`
        }
        // "video/mp4"
        return "/api/v1/videos/upload/tus";
    }

    async fallbackURL(storageKey: string): Promise<string> {
        return `/api/v1/media/nextcloud/${storageKey}`;
    }

    async directReadStream(storageKey: string) {
        const res = await fetch(this.pathUnderRoot(storageKey), {
            headers: this.getHeaders(),
        });

        if (!res.body) throw new Error("empty body");
        return Readable.fromWeb(res.body as any);
    }

    async deleteObject(path: string): Promise<boolean> {
        const url = this.pathUnderRoot(path);

        const res = await fetch(url, {
            method: "DELETE",
            headers: this.getHeaders(),
        });

        if (res.status === 204) {
            return true;
        }

        if (res.status === 404) {
            return true;
        }

        console.error("NextCloud delete failed", res.status, await res.text());
        return false;
    }

    async download(storageKey: string): Promise<Readable | string> {
        return await this.directReadStream(storageKey)
    }

    async createDirectory(path: string): Promise<void> {
        const url = `${this.davBaseURL}/${encodeURI(path)}`;
        const res = await fetch(url, {
            method: "MKCOL",
            headers: this.getHeaders(),
        });

        // 201: created
        // 405: already exists
        if (res.status === 201 || res.status === 405) {
            return;
        }

        throw new Error(
            `Failed to ensure root dir (${path}): ${res.status}`
        );
    }

    getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
        return {
            "Authorization": this.authHeader,
            ...extraHeaders
        };
    }

    /**
     * The storage key comes from a video title, so it can hold spaces, "%" or non-ASCII. It is
     * escaped here, once, rather than at each call site; the base URL is already escaped.
     */
    pathUnderRoot(path: string): string {
        return `${this.davBaseURL}/${encodeURI(`${this.rootPath}/${path}`)}`;
    }
}
