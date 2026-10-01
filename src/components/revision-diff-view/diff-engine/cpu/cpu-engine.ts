import { DiffEngine } from "../types";
import { createWorkerEngine } from "../worker-client";

// Runs frameDiff in a worker, so reading the pixels and diffing them never freezes the page.
export const createCpuEngine = (): DiffEngine =>
    createWorkerEngine("cpu", new Worker(new URL("./cpu.worker.ts", import.meta.url), { type: "module" }));
