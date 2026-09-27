import React from "react";
import { ColorSwatch } from "@/components/controls/color-swatch";

/** Colours used before, newest first. */
export function ColorHistory({ colors, selected, onSelect }: {
    colors: string[];
    selected: string;
    onSelect: (color: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {colors.map((c) => (
                <ColorSwatch key={c} color={c} selected={c === selected} onSelect={() => onSelect(c)} />
            ))}
        </div>
    );
}
