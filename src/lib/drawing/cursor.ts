import { faEyeDropper } from "@fortawesome/free-solid-svg-icons";

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
