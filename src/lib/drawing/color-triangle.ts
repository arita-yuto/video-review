import { hexToHsva, hsvaToRgba, rgbaToHex, type HsvaColor } from "@uiw/color-convert";

// Geometry of the paint-app colour triangle: the pure hue at the top corner, white
// bottom-left, black bottom-right, and every point a linear blend of the three.
// Everything is in a frame with the hue corner up; the view rotates it with the hue.

export interface Point { x: number; y: number }

/** Weights of the hue, white and black corners; they sum to 1 and go negative outside the triangle. */
export interface Weights { a: number; b: number; c: number }

/** Corner positions for a triangle inscribed in a circle of the given radius, centred on the origin. */
export const corners = (radius: number) => ({
    hue: { x: 0, y: -radius },
    white: { x: -radius * Math.sin(Math.PI / 3), y: radius / 2 },
    black: { x: radius * Math.sin(Math.PI / 3), y: radius / 2 },
});

/** Maps points to corner weights (barycentric coordinates). */
export const weigher = (radius: number) => {
    const { hue, white, black } = corners(radius);
    const det = (white.y - black.y) * (hue.x - black.x) + (black.x - white.x) * (hue.y - black.y);
    return (p: Point): Weights => {
        const a = ((white.y - black.y) * (p.x - black.x) + (black.x - white.x) * (p.y - black.y)) / det;
        const b = ((black.y - hue.y) * (p.x - black.x) + (hue.x - black.x) * (p.y - black.y)) / det;
        return { a, b, c: 1 - a - b };
    };
};

/** Pull a point outside the triangle back to its edge by dropping negative weights. */
export const clampWeights = ({ a, b, c }: Weights): Weights => {
    const ca = Math.max(a, 0), cb = Math.max(b, 0), cc = Math.max(c, 0);
    const sum = ca + cb + cc || 1;
    return { a: ca / sum, b: cb / sum, c: cc / sum };
};

/** Where a set of weights sits in the triangle. */
export const weightsToPoint = ({ a, b, c }: Weights, radius: number): Point => {
    const { hue, white, black } = corners(radius);
    return { x: a * hue.x + b * white.x + c * black.x, y: a * hue.y + b * white.y + c * black.y };
};

// A blend of hue, white and black is the colour whose channel maximum is a + b and
// minimum is b, so a colour maps back to its weights through its max and min channel.
export const colorToWeights = (hsva: HsvaColor): Weights => {
    const { r, g, b } = hsvaToRgba(hsva);
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    return { a: max - min, b: min, c: 1 - max };
};

/** The colour at a set of weights. The hue is kept as given: a grey blend would otherwise forget it. */
export const weightsToColor = (hue: number, { a, b }: Weights): HsvaColor => {
    const pure = hsvaToRgba({ h: hue, s: 100, v: 100, a: 1 });
    const hex = rgbaToHex({ r: a * pure.r + b * 255, g: a * pure.g + b * 255, b: a * pure.b + b * 255, a: 1 });
    return { ...hexToHsva(hex), h: hue };
};
