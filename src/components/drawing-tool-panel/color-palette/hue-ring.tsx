"use client";

import React, { useRef } from "react";
import { hsvaToHex, type HsvaColor } from "@uiw/color-convert";

/** What sits in the ring's hole: picks the two remaining coordinates of the colour. */
export interface InnerPickerProps {
    hsva: HsvaColor;
    /** Circumradius available inside the ring, in CSS pixels. */
    radius: number;
    onChange: (hsva: HsvaColor) => void;
}

/** Hue from a pointer position relative to the ring's centre: 0 at the top, clockwise. */
const hueFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    return (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
};

/** The rainbow ring with its marker; whatever is passed as children sits in the hole. */
export function HueRing({ hue, size, thickness, onChange, children }: {
    hue: number;
    /** Outer diameter and band width, in CSS pixels. */
    size: number;
    thickness: number;
    onChange: (hue: number) => void;
    children?: React.ReactNode;
}) {
    const dragging = useRef(false);

    const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = true;
        onChange(hueFromPointer(e));
    };
    const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (dragging.current) onChange(hueFromPointer(e));
    };
    const onUp = () => { dragging.current = false; };

    const vars = {
        "--ring-size": `${size}px`,
        "--ring-inner": `${size / 2 - thickness}px`,
        "--ring-thickness": `${thickness}px`,
        "--hue-angle": `${hue}deg`,
        "--swatch": hsvaToHex({ h: hue, s: 100, v: 100, a: 1 }),
    } as React.CSSProperties;

    return (
        <div className="relative size-(--ring-size) touch-none select-none" style={vars}>
            <div
                className="hue-ring absolute inset-0 cursor-pointer"
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
            />
            <div className="absolute inset-0 rotate-(--hue-angle) pointer-events-none">
                <div className="absolute left-1/2 top-0 -translate-x-1/2 size-(--ring-thickness) rounded-sm border-2 border-white bg-(--swatch) shadow-sm" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none [&>*]:pointer-events-auto">
                {children}
            </div>
        </div>
    );
}
