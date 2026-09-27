"use client";

import React from "react";
import Saturation from "@uiw/react-color-saturation";
import type { InnerPickerProps } from "@/components/drawing-tool-panel/color-palette/hue-ring";

/** The HSV square: saturation across, value down. The largest square that fits the hole. */
export function HsvSquare({ hsva, radius, onChange }: InnerPickerProps) {
    const side = Math.floor(radius * Math.SQRT2);
    return (
        <Saturation
            className="hue-ring-square"
            style={{ "--ring-square": `${side}px` } as React.CSSProperties}
            hsva={hsva}
            radius={4}
            onChange={(next) => onChange({ ...hsva, ...next })}
        />
    );
}
