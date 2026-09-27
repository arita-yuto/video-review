"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faRotateLeft, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/ui/button";
import { Slider } from "@/ui/slider";
import { Switch } from "@/ui/switch";
import { SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarHeader } from "@/ui/sidebar";
import { useDrawingStore } from "@/stores/drawing-store";
import { MAX_WIDTH, MIN_WIDTH, useDrawingSettingsStore } from "@/stores/drawing-settings-store";
import { TOOLS } from "@/lib/drawing/tools";
import { ColorPalette } from "@/components/drawing-tool-panel/color-palette";
import { ColorHistory } from "@/components/drawing-tool-panel/color-history";

// Replaces the video list while a comment's drawing is being edited, laid out like a
// paint app's tool palette so every brush control is one click away.
export default function DrawingToolPanel() {
    const t = useTranslations("drawing-tool-panel");
    const settings = useDrawingSettingsStore();
    const { tool, color, pressureEnabled, colorHistory, setTool, setColor, setWidth, setOpacity, setPressureEnabled } = settings;
    const { width, opacity } = settings.params[tool];
    const percent = Math.round(opacity * 100);
    const brushTools = TOOLS.filter((T) => T.group === "brush");
    const shapeTools = TOOLS.filter((T) => T.group === "shape");
    const { history, undoStroke, redoStroke, clearDrawing } = useDrawingStore();

    const canUndo = history.past.length > 0;
    const canRedo = history.future.length > 0;

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
                        {brushTools.map(({ id, icon: Icon, shortcut, hint }) => (
                            <Button key={id} variant={tool === id ? "accent" : "ghost"} title={`${t(id)} (${[shortcut, hint].filter(Boolean).join(", ")})`} onClick={() => setTool(id)}>
                                <Icon />
                                {t(id)}
                            </Button>
                        ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                        {shapeTools.map(({ id, icon: Icon, shortcut }) => (
                            <Button key={id} variant={tool === id ? "accent" : "ghost"} size="icon" title={`${t(id)} (${shortcut})`} onClick={() => setTool(id)}>
                                <Icon className="size-5" />
                            </Button>
                        ))}
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
                            value={[percent]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(v) => setOpacity(v[0] / 100)}
                            className="flex-1"
                        />
                        <span className="w-10 text-right text-xs text-muted-foreground">{percent}%</span>
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
