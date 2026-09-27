import { canvasPointFromClient } from "@/lib/drawing/pointer";
import { sampleColor } from "@/lib/drawing/tools/eyedropper/sample-color";
import { EYEDROPPER_CURSOR, EyedropperIcon } from "@/lib/drawing/icon";
import { Tool } from "@/lib/drawing/tools/tool";

/**
 * Follows the pointer while it is pressed, showing the colour as seen (frame plus
 * drawing) next to the one it replaces, and hands the previous tool back on release.
 * Used with Alt from any tool, it leaves the tool alone.
 */
export class EyedropperTool extends Tool {
    static readonly id = "eyedropper";
    static readonly icon = EyedropperIcon;
    static readonly shortcut = "I";
    static readonly hint = "Alt+click";
    static cursor() {
        return EYEDROPPER_CURSOR;
    }

    private colorBefore = "";

    private pickAt(e: PointerEvent) {
        const settings = this.ctx.settings();
        const point = canvasPointFromClient(this.ctx.canvas, e.clientX, e.clientY, 1);
        const hex = sampleColor(this.ctx.video(), this.ctx.committedLayer(), point) ?? settings.color;
        settings.setColor(hex);
        this.ctx.setPicking({ x: point.x, y: point.y, color: hex, previous: this.colorBefore });
    }

    down(e: PointerEvent) {
        this.colorBefore = this.ctx.settings().color;
        this.pickAt(e);
    }

    move(e: PointerEvent) {
        this.pickAt(e);
    }

    up() {
        this.ctx.setPicking(null);
        const settings = this.ctx.settings();
        if (settings.tool === "eyedropper") settings.setTool(settings.lastTool);
    }

    cancel() {
        this.ctx.setPicking(null);
    }
}
