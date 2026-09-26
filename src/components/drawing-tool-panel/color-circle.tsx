"use client";

import React, { useEffect, useRef, useState } from "react";
import Saturation from "@uiw/react-color-saturation";
import { hexToHsva, hsvaToHex, hsvaToHsla, type HsvaColor } from "@uiw/color-convert";
import { HlsTriangle } from "@/components/drawing-tool-panel/hls-triangle";
import type { ColorMode } from "@/stores/drawing-settings-store";

// Ring geometry in CSS pixels; the inner picker gets the largest circle that fits the hole.
const RING_SIZE = 240;
const RING_THICKNESS = 22;
const RING_INNER = RING_SIZE / 2 - RING_THICKNESS;
const INNER_RADIUS = RING_INNER - 4;

/** What sits inside the hue ring: picks the two remaining coordinates of the colour. */
export interface InnerPickerProps {
    hsva: HsvaColor;
    /** Circumradius available inside the ring, in CSS pixels. */
    radius: number;
    onChange: (hsva: HsvaColor) => void;
}

function SaturationSquare({ hsva, radius, onChange }: InnerPickerProps) {
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

/** Each mode is the picker inside the ring plus how the numbers under it read. */
const COLOR_MODES: Record<ColorMode, {
    Inner: (props: InnerPickerProps) => React.ReactElement;
    readout: (hsva: HsvaColor) => [string, number][];
}> = {
    hsv: {
        Inner: SaturationSquare,
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

export const colorReadout = (hsva: HsvaColor, mode: ColorMode) => COLOR_MODES[mode].readout(hsva);

/** Hue from a pointer position relative to the ring's centre: 0 at the top, clockwise. */
const hueFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    return (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
};

// A paint-app colour circle: hue on the ring, the rest on the mode's inner picker.
// The ring is our own (a conic gradient plus angle maths).
// State is HSV because hex forgets the hue once saturation or value hit zero, so it is
// only re-derived when the store's colour changed elsewhere (history, swap).
export function ColorCircle({ color, mode, onChange, onHsvaChange }: {
    color: string;
    mode: ColorMode;
    onChange: (hex: string) => void;
    onHsvaChange?: (hsva: HsvaColor) => void;
}) {
    const [hsva, setHsva] = useState<HsvaColor>(() => hexToHsva(color));
    const dragging = useRef(false);
    const { Inner } = COLOR_MODES[mode];

    useEffect(() => {
        if (hsvaToHex(hsva) !== color) setHsva(hexToHsva(color));
    }, [color]);

    useEffect(() => {
        onHsvaChange?.(hsva);
    }, [hsva]);

    const update = (next: HsvaColor) => {
        setHsva(next);
        onChange(hsvaToHex(next));
    };

    const onRingDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = true;
        update({ ...hsva, h: hueFromPointer(e) });
    };
    const onRingMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragging.current) update({ ...hsva, h: hueFromPointer(e) });
    };
    const onRingUp = () => { dragging.current = false; };

    const ringVars = {
        "--ring-size": `${RING_SIZE}px`,
        "--ring-inner": `${RING_INNER}px`,
        "--ring-thickness": `${RING_THICKNESS}px`,
        "--hue-angle": `${hsva.h}deg`,
        "--swatch": hsvaToHex({ h: hsva.h, s: 100, v: 100, a: 1 }),
    } as React.CSSProperties;

    return (
        <div className="relative size-(--ring-size) touch-none select-none" style={ringVars}>
            <div
                className="hue-ring absolute inset-0 cursor-pointer"
                onPointerDown={onRingDown}
                onPointerMove={onRingMove}
                onPointerUp={onRingUp}
                onPointerCancel={onRingUp}
            />
            <div className="absolute inset-0 rotate-(--hue-angle) pointer-events-none">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 size-(--ring-thickness) rounded-sm border-2 border-white bg-(--swatch) shadow-sm" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none [&>*]:pointer-events-auto">
                <Inner hsva={hsva} radius={INNER_RADIUS} onChange={update} />
            </div>
        </div>
    );
}
