"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faEraser, faEyeDropper, faFile, faRotateLeft, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/ui/button";
import { Slider } from "@/ui/slider";
import { Switch } from "@/ui/switch";
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader } from "@/ui/sidebar";
import { useDrawingStore } from "@/stores/drawing-store";
import { MAX_WIDTH, MIN_WIDTH, useDrawingSettingsStore } from "@/stores/drawing-settings-store";
import { ColorPalette } from "@/components/drawing-tool-panel/color-palette";
import { ColorHistory } from "@/components/drawing-tool-panel/color-history";

// Replaces the video list while a comment's drawing is being edited, laid out like a
// paint app's tool palette so every brush control is one click away.
export default function DrawingToolPanel() {
    const t = useTranslations("drawing-tool-panel");
    const {
        tool, brush, color, widths, opacities, pressureEnabled, colorHistory,
        setTool, setColor, setWidth, setOpacity, setPressureEnabled,
    } = useDrawingSettingsStore();
    const width = widths[brush];
    const opacity = Math.round(opacities[brush] * 100);
    const { history, undoStroke, redoStroke, clearDrawing } = useDrawingStore();

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
                        <Button variant={tool === "eyedropper" ? "accent" : "ghost"} title={`${t("eyedropper")} (I, Alt+click)`} onClick={() => setTool("eyedropper")}>
                            <FontAwesomeIcon icon={faEyeDropper} />
                            {t("eyedropper")}
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
                    <SidebarGroupLabel>{t("opacity")}</SidebarGroupLabel>
                    <div className="flex items-center gap-3">
                        <Slider
                            value={[opacity]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(v) => setOpacity(v[0] / 100)}
                            className="flex-1"
                        />
                        <span className="w-10 text-right text-xs text-muted-foreground">{opacity}%</span>
                    </div>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>{t("color")}</SidebarGroupLabel>
                    <ColorPalette />
                </SidebarGroup>

                {colorHistory.length > 0 && (
                    <SidebarGroup>
                        <SidebarGroupLabel>{t("colorHistory")}</SidebarGroupLabel>
                        <ColorHistory colors={colorHistory} selected={color} onSelect={setColor} />
                    </SidebarGroup>
                )}
            </SidebarContent>
        </>
    );
}
