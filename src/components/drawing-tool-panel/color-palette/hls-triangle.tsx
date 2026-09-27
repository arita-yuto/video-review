"use client";

import React, { useEffect, useRef } from "react";
import { hsvaToRgba } from "@uiw/color-convert";
import { clampWeights, colorToWeights, weigher, weightsToColor, weightsToPoint } from "@/lib/drawing/color-triangle";
import type { InnerPickerProps } from "@/components/drawing-tool-panel/color-palette/hue-ring";

/**
 * The paint-app triangle (see lib/drawing/color-triangle for the maths). Drawn on a
 * canvas with the hue corner up and rotated to follow the ring marker.
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
        onChange(weightsToColor(hue, clampWeights(weigher(radius)(p))));
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

    const marker = weightsToPoint(colorToWeights(hsva), radius);

    return (
        <div
            className="relative size-(--tri-size) rotate-(--hue-angle)"
            style={{ "--tri-size": `${size}px`, "--hue-angle": `${hue}deg`, "--marker-x": `${marker.x + radius}px`, "--marker-y": `${marker.y + radius}px` } as React.CSSProperties}
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
