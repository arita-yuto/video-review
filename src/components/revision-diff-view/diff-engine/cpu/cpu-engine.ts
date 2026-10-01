import { DiffEngine, DiffRequest } from "../types";
import type { FrameDiffRequest, FrameDiffResponse } from "./frame-diff.worker";

// Runs frameDiff in a worker; requests and responses are matched by id.
export const createCpuEngine = (): DiffEngine => {
    const worker = new Worker(new URL("./frame-diff.worker.ts", import.meta.url), { type: "module" });
    const pending = new Map<number, { resolve: (image: ImageBitmap) => void, reject: (e: unknown) => void }>();
    let nextId = 0;

    worker.addEventListener("message", (e: MessageEvent<FrameDiffResponse>) => {
        const res = e.data;
        const waiting = pending.get(res.id);
        pending.delete(res.id);
        if (!waiting) {
            if ("image" in res) res.image.close();
            return;
        }

        if ("image" in res) waiting.resolve(res.image);
        else if ("unreadable" in res) waiting.reject(new DOMException("The frames' pixels can't be read.", "SecurityError"));
        else waiting.reject(new Error(res.error));
    });

    // The worker answers every request, failed or not; an error event means it can't run at all,
    // e.g. its script failed to load.
    worker.addEventListener("error", (e) => {
        for (const waiting of pending.values()) waiting.reject(new Error(e.message));
        pending.clear();
    });

    return {
        diff: (request: DiffRequest) => new Promise<ImageBitmap>((resolve, reject) => {
            const id = nextId++;
            const message: FrameDiffRequest = { id, ...request };
            pending.set(id, { resolve, reject });
            try {
                worker.postMessage(message, [request.primary, request.compare]);
            } catch (e) {
                pending.delete(id);
                request.primary.close();
                request.compare.close();
                reject(e);
            }
        }),
        dispose: () => {
            worker.terminate();
            for (const waiting of pending.values()) waiting.reject(new DOMException("The engine was disposed.", "AbortError"));
            pending.clear();
        },
    };
};
