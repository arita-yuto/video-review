import { DiffEngine, isSecurityError } from "./types";
import { createCpuEngine } from "./cpu/cpu-engine";
import { createGpuEngine } from "./gpu/gpu-engine";

// A GPU that can't build the shaders is as good as none.
const tryGpu = () => {
    try {
        return createGpuEngine();
    } catch {
        return null;
    }
};

// The GPU engine where the machine has a usable GPU, the CPU engine otherwise. Once the GPU fails,
// the CPU engine takes the following requests; a SecurityError is about the media, so it doesn't.
export const createDiffEngine = (): DiffEngine => {
    const gpu = tryGpu();
    let engine = gpu ?? createCpuEngine();
    console.info(`diff engine: ${engine.name}`);

    return {
        get name() { return engine.name; },
        diff: async (request) => {
            try {
                return await engine.diff(request);
            } catch (e) {
                if (engine === gpu && !isSecurityError(e)) {
                    engine.dispose();
                    engine = createCpuEngine();
                    console.info(`diff engine: ${engine.name}, after the GPU failed`);
                }
                throw e;
            }
        },
        dispose: () => engine.dispose(),
    };
};
