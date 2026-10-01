import { DiffRequest, isSecurityError } from "./types";
import type { WorkerRequest, WorkerResponse } from "./worker-client";

// Runs inside an engine's worker. Every request is answered, failed or not, so the page never
// waits on one; the frames are closed whichever way the diff ended.
export const serveDiffs = (diff: (request: DiffRequest) => ImageBitmap) => {
    addEventListener("message", (e: MessageEvent<WorkerRequest>) => {
        const { id, ...request } = e.data;

        let response: WorkerResponse;
        try {
            response = { id, image: diff(request) };
        } catch (err) {
            // Media from another origin taints the frames, and the browser refuses to hand out their pixels.
            response = isSecurityError(err)
                ? { id, unreadable: true }
                : { id, error: err instanceof Error ? err.message : String(err) };
        } finally {
            request.primary.close();
            request.compare.close();
        }

        postMessage(response, { transfer: "image" in response ? [response.image] : [] });
    });
};
