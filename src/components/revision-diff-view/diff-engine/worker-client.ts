import { DiffEngine, DiffRequest } from "./types";

export type WorkerRequest = DiffRequest & { id: number };

export type WorkerResponse =
    | { id: number, image: ImageBitmap }
    | { id: number, unreadable: true }
    | { id: number, error: string };

// A DiffEngine backed by a worker that answers through worker-host; requests and responses are
// matched by id. The worker is created by each engine, where the bundler can see its URL.
export const createWorkerEngine = (name: string, worker: Worker): DiffEngine => {
    const pending = new Map<number, { resolve: (image: ImageBitmap) => void, reject: (e: unknown) => void }>();
    let nextId = 0;
    let broken: Error | null = null;

    worker.addEventListener("message", (e: MessageEvent<WorkerResponse>) => {
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
    // e.g. its script failed to load, and requests after it would never be answered either.
    worker.addEventListener("error", (e) => {
        broken = new Error(e.message || "The diff worker failed to start.");
        for (const waiting of pending.values()) waiting.reject(broken);
        pending.clear();
    });

    return {
        name,
        diff: (request: DiffRequest) => new Promise<ImageBitmap>((resolve, reject) => {
            if (broken) {
                request.primary.close();
                request.compare.close();
                return reject(broken);
            }

            const id = nextId++;
            const message: WorkerRequest = { id, ...request };
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
