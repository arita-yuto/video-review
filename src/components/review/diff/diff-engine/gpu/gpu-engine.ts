import { DiffEngine } from "../types";
import { createWorkerEngine } from "../worker-client";

// Draws in a worker, so even a GPU emulated in software never freezes the page. Null where WebGL2
// is missing or flagged as a major performance caveat, checked with a throwaway page context.
export const createGpuEngine = (): DiffEngine | null => {
    if (typeof OffscreenCanvas === "undefined") return null;

    const gl = new OffscreenCanvas(1, 1).getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!gl) return null;

    // The actual GPU, e.g. "ANGLE (NVIDIA, ... Direct3D11 ...)"; browsers that hide it say something else.
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();

    return createWorkerEngine(
        `gpu (${renderer})`,
        new Worker(new URL("./gpu.worker.ts", import.meta.url), { type: "module" }),
    );
};
