import React from "react";
import type { HsvaColor } from "@uiw/color-convert";
import { ColorMainToSub } from "@/components/drawing-tool-panel/color-palette/color-palette-tools/color-main-to-sub";
import { ColorValue } from "@/components/drawing-tool-panel/color-palette/color-palette-tools/color-value";

/** The row attached under the circle: main/sub colours and the colour's H S V. */
export function ColorPaletteTools({ color, subColor, hsva, swapTitle, onSwap }: {
    color: string;
    subColor: string;
    hsva: HsvaColor;
    swapTitle: string;
    onSwap: () => void;
}) {
    return (
        // Three equal columns keep the value centred under the circle even though the
        // chips on the left are wider than the empty right.
        <div className="grid w-full grid-cols-3 items-center">
            <ColorMainToSub color={color} subColor={subColor} swapTitle={swapTitle} className="justify-self-start" onSwap={onSwap} />
            <ColorValue entries={[["H", hsva.h], ["S", hsva.s], ["V", hsva.v]]} className="justify-self-center" />
        </div>
    );
}
