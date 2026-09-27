import type { ToolId } from "@/lib/drawing/types";
import type { ToolClass, ToolParams } from "@/lib/drawing/tools/tool";
import { EraserTool, PenTool } from "@/lib/drawing/tools/brush";
import { ArrowTool, EllipseTool, LineTool, RectTool } from "@/lib/drawing/tools/shape";
import { EyedropperTool } from "@/lib/drawing/tools/eyedropper";

/** Every tool, in the order the panel shows them. */
export const TOOLS: ToolClass[] = [PenTool, EraserTool, EyedropperTool, LineTool, ArrowTool, RectTool, EllipseTool];

export const toolClass = (id: ToolId): ToolClass => TOOLS.find((T) => T.id === id)!;

/** Every tool's starting parameters. */
export const defaultParams = (): Record<ToolId, ToolParams> =>
    Object.fromEntries(TOOLS.map((T) => [T.id, { ...T.defaults }])) as Record<ToolId, ToolParams>;
