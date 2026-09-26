"use client";

import React, { useEffect, useRef } from "react";
import { hexToHsva, hsvaToHex, hsvaToRgba, rgbaToHex, type HsvaColor } from "@uiw/color-convert";
import type { InnerPickerProps } from "@/components/drawing-tool-panel/color-circle";

interface Point { x: number; y: number }

/** Corner positions for a triangle inscribed in a circle of the given radius, centred on the origin. */
const corners = (radius: number) => ({
    hue: { x: 0, y: -radius },
    white: { x: -radius * Math.sin(Math.PI / 3), y: radius / 2 },
    black: { x: radius * Math.sin(Math.PI / 3), y: radius / 2 },
});

/** Maps points to the weights of the hue, white and black corners; they sum to 1 and go negative outside. */
const weigher = (radius: number) => {
    const { hue, white, black } = corners(radius);
    const det = (white.y - black.y) * (hue.x - black.x) + (black.x - white.x) * (hue.y - black.y);
    return (p: Point) => {
        const a = ((white.y - black.y) * (p.x - black.x) + (black.x - white.x) * (p.y - black.y)) / det;
        const b = ((black.y - hue.y) * (p.x - black.x) + (hue.x - black.x) * (p.y - black.y)) / det;
        return { a, b, c: 1 - a - b };
    };
};

/** Pull a point outside the triangle back to its edge by dropping negative weights. */
const clampWeights = ({ a, b, c }: { a: number; b: number; c: number }) => {
    const ca = Math.max(a, 0), cb = Math.max(b, 0), cc = Math.max(c, 0);
    const sum = ca + cb + cc || 1;
    return { a: ca / sum, b: cb / sum, c: cc / sum };
};

// A blend of hue, white and black is the colour whose channel maximum is a + b and
// minimum is b, so a colour maps back to its weights through its max and min channel.
const colorToWeights = (hsva: HsvaColor) => {
    const { r, g, b } = hsvaToRgba(hsva);
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    return { a: max - min, b: min, c: 1 - max };
};

/**
 * The classic paint-app triangle: the pure hue at the top corner, white bottom-left,
 * black bottom-right, and every point a linear blend of the three. Drawn on a canvas
 * with the hue corner up; the parent rotates it to follow the ring marker.
 */
export function HlsTriangle({ hsva, radius, onChange }: InnerPickerProps) {
    const hue = hsva.h;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const dragging = useRef(false);
    const size = radius * 2;

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const scale = window.devicePixelRatio || 1;
        canvas.width = size * scale;
        canvas.height = size * scale;
        const image = ctx.createImageData(canvas.width, canvas.height);
        const pure = hsvaToRgba({ h: hue, s: 100, v: 100, a: 1 });
        const weights = weigher(radius);

        for (let py = 0; py < canvas.height; py++) {
            for (let px = 0; px < canvas.width; px++) {
                const { a, b, c } = weights({ x: px / scale - radius, y: py / scale - radius });
                if (a < 0 || b < 0 || c < 0) continue;

                const i = (py * canvas.width + px) * 4;
                image.data[i] = a * pure.r + b * 255;
                image.data[i + 1] = a * pure.g + b * 255;
                image.data[i + 2] = a * pure.b + b * 255;
                image.data[i + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
    }, [hue, radius, size]);

    const pick = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // The canvas is rotated with the hue; undo that to get back to the drawn frame.
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const angle = -hue * Math.PI / 180;
        const p = { x: dx * Math.cos(angle) - dy * Math.sin(angle), y: dx * Math.sin(angle) + dy * Math.cos(angle) };

        const { a, b } = clampWeights(weigher(radius)(p));
        const pure = hsvaToRgba({ h: hue, s: 100, v: 100, a: 1 });
        const hex = rgbaToHex({ r: a * pure.r + b * 255, g: a * pure.g + b * 255, b: a * pure.b + b * 255, a: 1 });
        // Keep the hue: it is the ring's, and a grey blend would otherwise forget it.
        onChange({ ...hexToHsva(hex), h: hue });
    };

    const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = true;
        pick(e);
    };
    const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (dragging.current) pick(e);
    };
    const onUp = () => { dragging.current = false; };

    const { a, b, c } = colorToWeights(hsva);
    const { hue: h, white, black } = corners(radius);
    const marker = { x: a * h.x + b * white.x + c * black.x + radius, y: a * h.y + b * white.y + c * black.y + radius };

    return (
        <div
            className="relative size-(--tri-size) rotate-(--hue-angle)"
            style={{ "--tri-size": `${size}px`, "--hue-angle": `${hue}deg`, "--marker-x": `${marker.x}px`, "--marker-y": `${marker.y}px` } as React.CSSProperties}
        >
            <canvas
                ref={canvasRef}
                data-slot="hls-triangle"
                className="size-full cursor-crosshair touch-none"
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
            />
            <div className="absolute left-(--marker-x) top-(--marker-y) -translate-1/2 size-3 rounded-full border-2 border-white shadow-sm pointer-events-none" />
        </div>
    );
}
