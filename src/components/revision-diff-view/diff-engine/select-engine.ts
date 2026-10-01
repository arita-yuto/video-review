import { DiffEngine } from "./types";
import { createCpuEngine } from "./cpu/cpu-engine";

export const createDiffEngine = (): DiffEngine => createCpuEngine();
