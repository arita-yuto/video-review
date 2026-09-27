"use client";

import React from "react";
import type { HsvaColor } from "@uiw/color-convert";
import { HueRing } from "@/components/drawing-tool-panel/color-palette/hue-ring";
import { HsvSquare } from "@/components/drawing-tool-panel/color-palette/hsv-square";

// Ring geometry in CSS pixels; the square gets the largest circle that fits the hole.
const RING_SIZE = 240;
const RING_THICKNESS = 22;
const RING_GAP = 4;
const INNER_RADIUS = RING_SIZE / 2 - RING_THICKNESS - RING_GAP;

// A paint-app colour circle: hue on the ring, saturation and value on the square.
// Controlled in HSV, since hex forgets the hue once saturation or value hit zero.
export function ColorCircle({ hsva, onChange }: { hsva: HsvaColor; onChange: (hsva: HsvaColor) => void }) {
    return (
        <HueRing hue={hsva.h} size={RING_SIZE} thickness={RING_THICKNESS} onChange={(h) => onChange({ ...hsva, h })}>
            <HsvSquare hsva={hsva} radius={INNER_RADIUS} onChange={onChange} />
        </HueRing>
    );
}
