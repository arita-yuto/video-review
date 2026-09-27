"use client";

import React from "react";
import type { HsvaColor } from "@uiw/color-convert";
import type { ColorMode } from "@/lib/drawing/types";
import { HueRing } from "@/components/drawing-tool-panel/color-palette/hue-ring";
import { COLOR_MODES } from "@/components/drawing-tool-panel/color-palette/color-modes";

// Ring geometry in CSS pixels; the inner picker gets the largest circle that fits the hole.
const RING_SIZE = 240;
const RING_THICKNESS = 22;
const RING_GAP = 4;
const INNER_RADIUS = RING_SIZE / 2 - RING_THICKNESS - RING_GAP;

// A paint-app colour circle: hue on the ring, the rest on the mode's inner picker.
// Controlled in HSV, since hex forgets the hue once saturation or value hit zero.
export function ColorCircle({ hsva, mode, onChange }: {
    hsva: HsvaColor;
    mode: ColorMode;
    onChange: (hsva: HsvaColor) => void;
}) {
    const { Inner } = COLOR_MODES[mode];

    return (
        <HueRing hue={hsva.h} size={RING_SIZE} thickness={RING_THICKNESS} onChange={(h) => onChange({ ...hsva, h })}>
            <Inner hsva={hsva} radius={INNER_RADIUS} onChange={onChange} />
        </HueRing>
    );
}
