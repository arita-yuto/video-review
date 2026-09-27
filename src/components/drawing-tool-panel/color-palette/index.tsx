"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useDrawingSettingsStore } from "@/stores/drawing-settings-store";
import { ColorCircle } from "@/components/drawing-tool-panel/color-palette/color-circle";
import { colorReadout } from "@/components/drawing-tool-panel/color-palette/color-modes";
import { usePaletteColor } from "@/components/drawing-tool-panel/color-palette/use-palette-color";
import { ColorPaletteTools } from "@/components/drawing-tool-panel/color-palette/color-palette-tools";

/** The colour circle with its tools, wired to the brush settings. The only place here that knows the store. */
export function ColorPalette() {
    const t = useTranslations("drawing-tool-panel");
    const { color, subColor, colorMode, swapColors, setColorMode } = useDrawingSettingsStore();
    const { hsva, pick } = usePaletteColor();

    return (
        <div className="flex flex-col items-center gap-2">
            <ColorCircle hsva={hsva} mode={colorMode} onChange={pick} />
            <ColorPaletteTools
                color={color}
                subColor={subColor}
                value={colorReadout(hsva, colorMode)}
                mode={colorMode}
                swapTitle={`${t("swapColors")} (X)`}
                modeTitle={t("colorMode")}
                onSwap={swapColors}
                onModeChange={setColorMode}
            />
        </div>
    );
}
