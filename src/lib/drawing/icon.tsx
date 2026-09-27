import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEraser, faEyeDropper, faPen } from "@fortawesome/free-solid-svg-icons";
import type { ShapeKind } from "@/lib/drawing/types";

// The drawing feature's own pictures: cursors (SVG packed into a CSS cursor value) and
// the icons FontAwesome has no equivalent for.

const svgCursor = (svg: string, hotspotX: number, hotspotY: number) =>
    `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspotX} ${hotspotY}, crosshair`;

const brushCursors = new Map<number, string>();

/**
 * A CSS `cursor` value showing the brush outline: a circle the size of the line width
 * in CSS pixels, white with a dark rim so it reads on any frame. Falls back to the
 * crosshair where image cursors are unsupported.
 */
export const brushCursor = (width: number) => {
    const cached = brushCursors.get(width);
    if (cached) return cached;
    const cursor = buildBrushCursor(width);
    brushCursors.set(width, cursor);
    return cursor;
};

const buildBrushCursor = (width: number) => {
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
export const EYEDROPPER_CURSOR = (() => {
    const [width, height, , , path] = faEyeDropper.icon;
    const size = 24;
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${width} ${height}">` +
        `<path d="${path}" fill="white" stroke="black" stroke-width="24" stroke-linejoin="round" paint-order="stroke"/>` +
        `</svg>`;
    return svgCursor(svg, 2, size - 2);
})();

type IconProps = { className?: string };

export const PenIcon = ({ className }: IconProps) => <FontAwesomeIcon icon={faPen} className={className} />;
export const EraserIcon = ({ className }: IconProps) => <FontAwesomeIcon icon={faEraser} className={className} />;
export const EyedropperIcon = ({ className }: IconProps) => <FontAwesomeIcon icon={faEyeDropper} className={className} />;

/** The shape tools' outlines. */
const shapeIcon = (kind: ShapeKind) => ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {kind === "line" && <line x1="4" y1="20" x2="20" y2="4" />}
        {kind === "arrow" && <><line x1="4" y1="20" x2="20" y2="4" /><polyline points="11,4 20,4 20,13" /></>}
        {kind === "rect" && <rect x="4" y="5" width="16" height="14" rx="1" />}
        {kind === "ellipse" && <ellipse cx="12" cy="12" rx="8.5" ry="6.5" />}
    </svg>
);
export const LineIcon = shapeIcon("line");
export const ArrowIcon = shapeIcon("arrow");
export const RectIcon = shapeIcon("rect");
export const EllipseIcon = shapeIcon("ellipse");
