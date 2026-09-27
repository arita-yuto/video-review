"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useDrawingSettingsStore } from "@/stores/drawing-settings-store";
import { ColorCircle } from "@/components/drawing-tool-panel/color-palette/color-circle";
import { usePaletteColor } from "@/components/drawing-tool-panel/color-palette/use-palette-color";
import { ColorPaletteTools } from "@/components/drawing-tool-panel/color-palette/color-palette-tools";

/** The colour circle with its tools, wired to the brush settings. The only place here that knows the store. */
export function ColorPalette() {
    const t = useTranslations("drawing-tool-panel");
    const { color, subColor, swapColors } = useDrawingSettingsStore();
    const { hsva, pick } = usePaletteColor();

    return (
        <div className="flex flex-col items-center gap-2">
            <ColorCircle hsva={hsva} onChange={pick} />
            <ColorPaletteTools color={color} subColor={subColor} hsva={hsva} swapTitle={`${t("swapColors")} (X)`} onSwap={swapColors} />
        </div>
    );
}
