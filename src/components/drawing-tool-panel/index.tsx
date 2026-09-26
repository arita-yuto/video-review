"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { hexToHsva, type HsvaColor } from "@uiw/color-convert";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faEraser, faFile, faRotateLeft, faRotateRight, faRightLeft } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/ui/button";
import { Slider } from "@/ui/slider";
import { Switch } from "@/ui/switch";
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader } from "@/ui/sidebar";
import { useDrawingStore } from "@/stores/drawing-store";
import { MAX_WIDTH, MIN_WIDTH, useDrawingSettingsStore, type ColorMode } from "@/stores/drawing-settings-store";
import { ColorCircle, colorReadout } from "@/components/drawing-tool-panel/color-circle";
import { cn } from "@/lib/utils";

function ColorSwatch({ color, selected, title, onSelect }: {
    color: string;
    selected?: boolean;
    title?: string;
    /** Without a handler the swatch only displays the colour. */
    onSelect?: () => void;
}) {
    const className = cn(
        "size-7 rounded-md border bg-(--swatch) transition-all",
        selected ? "border-primary ring-2 ring-primary/50" : "border-input",
        onSelect && !selected && "hover:border-ring",
    );
    const style = { "--swatch": color } as React.CSSProperties;

    if (!onSelect) return <div title={title ?? color} className={className} style={style} />;

    return (
        <button type="button" title={title ?? color} aria-pressed={selected} onClick={onSelect} className={className} style={style} />
    );
}

// The colour-mode button shows the shape it switches to, the way paint apps do:
// a triangle (HLS) while the square is up, a square (HSV) while the triangle is.
function ColorModeIcon({ next }: { next: ColorMode }) {
    return (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            {next === "hls"
                ? <polygon points="8.5,6.5 18,12 8.5,17.5" />
                : <rect x="7.5" y="7.5" width="9" height="9" />}
        </svg>
    );
}

// Replaces the video list while a comment's drawing is being edited, laid out like a
// paint app's tool palette so every brush control is one click away.
export default function DrawingToolPanel() {
    const t = useTranslations("drawing-tool-panel");
    const {
        tool, color, subColor, widths, pressureEnabled, colorHistory, colorMode,
        setTool, setColor, swapColors, setWidth, setColorMode, setPressureEnabled,
    } = useDrawingSettingsStore();
    const width = widths[tool];
    const { history, undoStroke, redoStroke, clearDrawing } = useDrawingStore();
    const [hsva, setHsva] = useState<HsvaColor>(() => hexToHsva(color));

    const canUndo = history.items.length > 0;
    const canRedo = history.undone.length > 0;

    return (
        <>
            <SidebarHeader>
                <div className="flex items-center justify-between text-primary font-semibold text-sm">
                    <span>{t("title")}</span>
                    <div className="flex items-center gap-1">
                        <Button variant="toolbar" size="icon-sm" title={`${t("undo")} (Ctrl+Z)`} disabled={!canUndo} onClick={undoStroke}>
                            <FontAwesomeIcon icon={faRotateLeft} />
                        </Button>
                        <Button variant="toolbar" size="icon-sm" title={`${t("redo")} (Ctrl+Y)`} disabled={!canRedo} onClick={redoStroke}>
                            <FontAwesomeIcon icon={faRotateRight} />
                        </Button>
                        <Button variant="toolbar" size="icon-sm" title={t("clear")} onClick={clearDrawing}>
                            <FontAwesomeIcon icon={faFile} />
                        </Button>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>{t("tool")}</SidebarGroupLabel>
                    <div className="flex gap-2">
                        <Button variant={tool === "pen" ? "accent" : "ghost"} title={`${t("pen")} (B)`} onClick={() => setTool("pen")}>
                            <FontAwesomeIcon icon={faPen} />
                            {t("pen")}
                        </Button>
                        <Button variant={tool === "eraser" ? "accent" : "ghost"} title={`${t("eraser")} (E)`} onClick={() => setTool("eraser")}>
                            <FontAwesomeIcon icon={faEraser} />
                            {t("eraser")}
                        </Button>
                    </div>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>{t("lineWidth")}</SidebarGroupLabel>
                    <div className="flex items-center gap-3" title="[ ]">
                        <Slider
                            value={[width]}
                            min={MIN_WIDTH}
                            max={MAX_WIDTH}
                            step={1}
                            onValueChange={(v) => setWidth(v[0])}
                            className="flex-1"
                        />
                        <span className="w-10 text-right text-xs text-muted-foreground">{width}px</span>
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch checked={pressureEnabled} onCheckedChange={setPressureEnabled} />
                        {t("pressure")}
                    </label>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>{t("color")}</SidebarGroupLabel>
                    <div className="flex flex-col items-center gap-2">
                        <ColorCircle color={color} mode={colorMode} onChange={setColor} onHsvaChange={setHsva} />
                        {/* Three equal columns keep the numbers centred under the circle even though
                            the chips on the left are wider than the button on the right. */}
                        <div className="grid w-full grid-cols-3 items-center">
                            <div className="flex items-center gap-1 justify-self-start">
                                <ColorSwatch color={color} selected />
                                <Button variant="ghost" size="icon-sm" title={`${t("swapColors")} (X)`} onClick={swapColors}>
                                    <FontAwesomeIcon icon={faRightLeft} />
                                </Button>
                                <ColorSwatch color={subColor} onSelect={swapColors} />
                            </div>
                            {/* Fixed-width numbers so the labels stay put while the digits change. */}
                            <div className="flex gap-2 justify-self-center text-xs text-muted-foreground tabular-nums leading-none">
                                {colorReadout(hsva, colorMode).map(([label, value]) => (
                                    <span key={label} className="inline-flex gap-1">
                                        <span>{label}</span>
                                        <span className="w-6 text-right">{Math.round(value)}</span>
                                    </span>
                                ))}
                            </div>
                            <Button variant="ghost" size="icon-sm" className="justify-self-end" title={t("colorMode")} onClick={() => setColorMode(colorMode === "hsv" ? "hls" : "hsv")}>
                                <ColorModeIcon next={colorMode === "hsv" ? "hls" : "hsv"} />
                            </Button>
                        </div>
                    </div>
                </SidebarGroup>

                {colorHistory.length > 0 && (
                    <SidebarGroup>
                        <SidebarGroupLabel>{t("colorHistory")}</SidebarGroupLabel>
                        <div className="flex flex-wrap gap-1.5">
                            {colorHistory.map((c) => (
                                <ColorSwatch key={c} color={c} selected={c === color} onSelect={() => setColor(c)} />
                            ))}
                        </div>
                    </SidebarGroup>
                )}
            </SidebarContent>
        </>
    );
}
