import React from "react";
import { faEyeDropper } from "@fortawesome/free-solid-svg-icons";
import type { ColorMode } from "@/lib/drawing/types";

// The drawing feature's own pictures: cursors (SVG packed into a CSS cursor value) and
// the icons FontAwesome has no equivalent for.

const svgCursor = (svg: string, hotspotX: number, hotspotY: number) =>
    `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspotX} ${hotspotY}, crosshair`;

/**
 * A CSS `cursor` value showing the brush outline: a circle the size of the line width
 * in CSS pixels, white with a dark rim so it reads on any frame. Falls back to the
 * crosshair where image cursors are unsupported.
 */
export const brushCursor = (width: number) => {
    const diameter = Math.max(width, 3);
    const size = Math.ceil(diameter) + 4;
    const centre = size / 2;
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
        `<circle cx="${centre}" cy="${centre}" r="${diameter / 2}" fill="none" stroke="black" stroke-opacity="0.6" stroke-width="2.5"/>` +
        `<circle cx="${centre}" cy="${centre}" r="${diameter / 2}" fill="none" stroke="white" stroke-width="1"/>` +
        `</svg>`;
    return svgCursor(svg, Math.floor(centre), Math.floor(centre));
};

/** The tool panel's eyedropper icon as a cursor, with the pipette's tip (bottom-left) as the hotspot. */
export const eyedropperCursor = () => {
    const [width, height, , , path] = faEyeDropper.icon;
    const size = 24;
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${width} ${height}">` +
        `<path d="${path}" fill="white" stroke="black" stroke-width="24" stroke-linejoin="round" paint-order="stroke"/>` +
        `</svg>`;
    return svgCursor(svg, 2, size - 2);
};

/** A colour mode's shape inside a circle: the triangle for HLS, the square for HSV. */
export function ColorModeIcon({ mode, className }: { mode: ColorMode; className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            {mode === "hls"
                ? <polygon points="8.5,6.5 18,12 8.5,17.5" />
                : <rect x="7.5" y="7.5" width="9" height="9" />}
        </svg>
    );
}
