import { canvasPointFromClient } from "@/lib/drawing/pointer";
import { sampleColor } from "@/lib/drawing/tools/eyedropper/sample-color";
import type { PointerTool, ToolContext } from "@/lib/drawing/tools/types";

/**
 * Follows the pointer while it is pressed, showing the colour as seen (frame plus
 * drawing) next to the one it replaces, and hands the brush back on release. Used
 * with Alt from any tool, it leaves the tool alone.
 */
export const createEyedropperTool = (ctx: ToolContext): PointerTool => {
    let colorBefore = "";

    const pickAt = (e: PointerEvent) => {
        const settings = ctx.settings();
        const point = canvasPointFromClient(ctx.canvas, e.clientX, e.clientY, 1);
        const hex = sampleColor(ctx.video(), ctx.committedLayer(), point) ?? settings.color;
        settings.setColor(hex);
        ctx.setPicking({ x: point.x, y: point.y, color: hex, previous: colorBefore });
    };

    return {
        down: (e) => {
            colorBefore = ctx.settings().color;
            pickAt(e);
        },
        move: pickAt,
        up: () => {
            ctx.setPicking(null);
            const settings = ctx.settings();
            if (settings.tool === "eyedropper") settings.setTool(settings.brush);
        },
        cancel: () => ctx.setPicking(null),
        live: () => null,
    };
};
