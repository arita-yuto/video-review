import { useEffect, useState } from "react";
import { hexToHsva, hsvaToHex, type HsvaColor } from "@uiw/color-convert";
import { useDrawingSettingsStore } from "@/stores/drawing-settings-store";

/**
 * The brush colour as the palette sees it, in HSV. Re-derived from the store's hex only
 * when the colour changed elsewhere (history, swap, eyedropper), so the hue survives a
 * grey or black pick that hex could not carry.
 */
export const usePaletteColor = () => {
    const { color, setColor } = useDrawingSettingsStore();
    const [hsva, setHsva] = useState<HsvaColor>(() => hexToHsva(color));

    useEffect(() => {
        if (hsvaToHex(hsva) !== color) setHsva(hexToHsva(color));
    }, [color]);

    const pick = (next: HsvaColor) => {
        setHsva(next);
        setColor(hsvaToHex(next));
    };

    return { hsva, pick };
};
