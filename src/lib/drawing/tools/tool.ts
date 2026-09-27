import type React from "react";
import type { Mark, ToolId } from "@/lib/drawing/types";

export interface ToolParams {
    /** Line width in CSS pixels. */
    width: number;
    /** 0..1 */
    opacity: number;
}

/** The settings a tool reads and writes; the settings store provides them. */
export interface DrawingSettings {
    tool: ToolId;
    /** The tool in use before the eyedropper, which hands back to it after a pick. */
    lastTool: ToolId;
    color: string;
    params: Record<ToolId, ToolParams>;
    pressureEnabled: boolean;
    setTool: (tool: ToolId) => void;
    setColor: (color: string) => void;
    noteColorUsed: (color: string) => void;
}

/** What every tool may reach while a pointer is down. */
export interface ToolContext {
    canvas: HTMLCanvasElement;
    settings: () => DrawingSettings;
    /** The base plus the committed marks, as currently painted. */
    committedLayer: () => HTMLCanvasElement | null;
    video: () => HTMLVideoElement | null;
    /** Ask for the live layer to be painted on the next frame. */
    repaint: () => void;
    commitMark: (mark: Mark) => void;
    setPicking: (picking: { x: number; y: number; color: string; previous: string } | null) => void;
}

/**
 * One pointer's interaction with the canvas, from press to release. Subclasses
 * override what they need; the defaults do nothing.
 */
export abstract class Tool {
    static readonly group: "brush" | "shape" = "brush";
    static readonly defaults: ToolParams = { width: 10, opacity: 1 };
    static cursor(_params: ToolParams): string {
        return "crosshair";
    }

    constructor(protected readonly ctx: ToolContext) {}

    /** The id this instance was made from; the class carries it. */
    protected get id(): ToolId {
        return (this.constructor as ToolClass).id;
    }

    abstract down(e: PointerEvent): void;
    abstract move(e: PointerEvent): void;
    abstract up(e: PointerEvent): void;

    /** Drop the interaction without a result (the session ending). */
    cancel(): void {}

    /** What to paint over the committed layer this frame. */
    live(): Mark | null {
        return null;
    }
}

/** The fixed values a tool class carries, and how instances are made. */
export interface ToolClass {
    readonly id: ToolId;
    /** Where the panel shows it: the brush row carries labels, the shape row only icons. */
    readonly group: "brush" | "shape";
    readonly icon: React.ComponentType<{ className?: string }>;
    readonly shortcut: string;
    /** Another way to reach the tool, shown next to the shortcut. */
    readonly hint?: string;
    /** Starting size and opacity. */
    readonly defaults: ToolParams;
    /** The pointer's look over the canvas while this tool is selected. */
    cursor(params: ToolParams): string;
    new (ctx: ToolContext): Tool;
}
