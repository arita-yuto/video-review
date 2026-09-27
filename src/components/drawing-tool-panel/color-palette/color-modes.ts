import type React from "react";
import { hsvaToHsla, type HsvaColor } from "@uiw/color-convert";
import type { ColorMode } from "@/lib/drawing/types";
import { HsvSquare } from "@/components/drawing-tool-panel/color-palette/hsv-square";
import { HlsTriangle } from "@/components/drawing-tool-panel/color-palette/hls-triangle";
import type { InnerPickerProps } from "@/components/drawing-tool-panel/color-palette/hue-ring";

/** Each mode is the picker inside the ring plus how the numbers under it read. */
export const COLOR_MODES: Record<ColorMode, {
    Inner: (props: InnerPickerProps) => React.ReactElement;
    readout: (hsva: HsvaColor) => [string, number][];
}> = {
    hsv: {
        Inner: HsvSquare,
        readout: (hsva) => [["H", hsva.h], ["S", hsva.s], ["V", hsva.v]],
    },
    hls: {
        Inner: HlsTriangle,
        readout: (hsva) => {
            const { h, s, l } = hsvaToHsla(hsva);
            return [["H", h], ["L", l], ["S", s]];
        },
    },
};

/** The colour's numbers in the mode's coordinate system. */
export const colorReadout = (hsva: HsvaColor, mode: ColorMode) => COLOR_MODES[mode].readout(hsva);
