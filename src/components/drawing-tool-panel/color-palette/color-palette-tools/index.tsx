import React from "react";
import type { ColorMode } from "@/lib/drawing/types";
import { ColorMainToSub } from "@/components/drawing-tool-panel/color-palette/color-palette-tools/color-main-to-sub";
import { ColorValue } from "@/components/drawing-tool-panel/color-palette/color-palette-tools/color-value";
import { ColorModeSwitch } from "@/components/drawing-tool-panel/color-palette/color-palette-tools/color-mode-switch";

/** The row attached under the circle: main/sub colours, the colour's value, and the mode switch. */
export function ColorPaletteTools({ color, subColor, value, mode, swapTitle, modeTitle, onSwap, onModeChange }: {
    color: string;
    subColor: string;
    value: [string, number][];
    mode: ColorMode;
    swapTitle: string;
    modeTitle: string;
    onSwap: () => void;
    onModeChange: (mode: ColorMode) => void;
}) {
    return (
        // Three equal columns keep the value centred under the circle even though the
        // chips on the left are wider than the switch on the right.
        <div className="grid w-full grid-cols-3 items-center">
            <ColorMainToSub color={color} subColor={subColor} swapTitle={swapTitle} className="justify-self-start" onSwap={onSwap} />
            <ColorValue entries={value} className="justify-self-center" />
            <ColorModeSwitch mode={mode} title={modeTitle} className="justify-self-end" onChange={onModeChange} />
        </div>
    );
}
