import * as tus from "tus-js-client";

import { authHeaders } from "@/api";
import { UploadSession, UploadStorageType } from "@/lib/db-types";

/** Path init hands back when the server is set up for chunked uploads. */
const TUS_PATH = "/api/v1/videos/upload/tus";

/** Only reached if the server did not report a size of its own. */
const FALLBACK_CHUNK_SIZE = 16 * 1024 * 1024;

// Carries the HTTP status so the caller can tell a rejected size (413) from other failures.
export class UploadTransferError extends Error {
    readonly status: number;

    constructor(status: number) {
        super(`upload transfer failed with status ${status}`);
        this.name = "UploadTransferError";
        this.status = status;
    }
}

type TransferRequest = {
    url: string;
    session: UploadSession;
    file: Blob;
    /** Size of one chunk, as the server reported it at init. */
    chunkSize?: number;
    onProgress?: (sentBytes: number, totalBytes: number) => void;
};

// Sends the bytes to the URL issued by an upload session: a presigned PUT for S3, the chunked
// route for videos, and a single request for the small PNGs of a drawing.
export async function uploadToSession(data: TransferRequest): Promise<void> {
    if (data.session.storage === UploadStorageType.s3) {
        const res = await fetch(data.url, {
            method: "PUT",
            body: data.file,
            headers: { "Content-Type": data.file.type },
        });
        if (!res.ok) throw new UploadTransferError(res.status);
        return;
    }

    if (data.url.endsWith(TUS_PATH)) {
        return uploadInChunks(data);
    }

    const form = new FormData();
    form.append("file", data.file);
    const res = await fetch(data.url, {
        method: "PUT",
        body: form,
        headers: authHeaders(),
    });
    if (!res.ok) throw new UploadTransferError(res.status);
}

// Chunked upload, so a file larger than an upstream body limit still gets through and an
// interrupted transfer resumes where it stopped.
function uploadInChunks(data: TransferRequest): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(data.file, {
            endpoint: data.url,
            chunkSize: data.chunkSize ?? FALLBACK_CHUNK_SIZE,
            headers: authHeaders(),
            // Where the bytes are stored is read from this session on the server, never sent by us.
            metadata: { sessionId: data.session.id },
            onProgress: (sent, total) => data.onProgress?.(sent, total),
            onSuccess: () => resolve(),
            onError: (error) => {
                const status = error instanceof tus.DetailedError
                    ? error.originalResponse?.getStatus() ?? 0
                    : 0;
                reject(status ? new UploadTransferError(status) : error);
            },
        });

        upload.start();
    });
}
