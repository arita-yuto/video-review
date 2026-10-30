import { DiffEngine, isSecurityError } from "./types";
import { createCpuEngine } from "./cpu/cpu-engine";
import { createGpuEngine } from "./gpu/gpu-engine";

// The GPU engine where the machine has a usable GPU, the CPU engine otherwise. Once the GPU fails,
// the CPU engine takes the following requests; a SecurityError is about the media, so it doesn't.
export const createDiffEngine = (): DiffEngine => {
    const gpu = createGpuEngine();
    let engine = gpu ?? createCpuEngine();
    console.info(`diff engine: ${engine.name}`);
    // Disposing rejects the requests in flight, which is no reason to switch.
    let disposed = false;

    return {
        get name() { return engine.name; },
        diff: async (request) => {
            try {
                return await engine.diff(request);
            } catch (e) {
                if (engine === gpu && !disposed && !isSecurityError(e)) {
                    engine.dispose();
                    engine = createCpuEngine();
                    console.info(`diff engine: ${engine.name}, after the GPU failed: ${e instanceof Error ? e.message : e}`);
                }
                throw e;
            }
        },
        dispose: () => {
            disposed = true;
            engine.dispose();
        },
    };
};
