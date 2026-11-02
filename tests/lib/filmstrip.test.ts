import { describe, expect, it } from "vitest";
import { filmstripIndexAt, filmstripInterval, filmstripTile, parseFilmstrip } from "@/lib/filmstrip";

describe("parseFilmstrip", () => {
    it("returns the stored fields when they are all positive numbers", () => {
        const stored = { interval: 4, tileWidth: 160, tileHeight: 90, count: 150 };
        expect(parseFilmstrip(stored)).toEqual(stored);
    });

    it("reads a missing field or no value as no filmstrip", () => {
        expect(parseFilmstrip({ interval: 4, tileWidth: 160, tileHeight: 90 })).toBeNull();
        expect(parseFilmstrip(null)).toBeNull();
    });
});

describe("filmstripTile", () => {
    it("starts a new sheet after 100 tiles", () => {
        expect(filmstripTile(99)).toEqual({ sheet: 0, col: 9, row: 9 });
        expect(filmstripTile(100)).toEqual({ sheet: 1, col: 0, row: 0 });
    });
});

describe("filmstripIndexAt", () => {
    it("maps a time to the tile at or before it, clamped to the strip", () => {
        const strip = { interval: 4, tileWidth: 160, tileHeight: 90, count: 150 };
        expect(filmstripIndexAt(strip, 0)).toBe(0);
        expect(filmstripIndexAt(strip, 7.9)).toBe(1);
        expect(filmstripIndexAt(strip, 10_000)).toBe(149);
    });
});

describe("filmstripInterval", () => {
    it("is a whole second, never below one, rounded up for long videos", () => {
        expect(filmstripInterval(30)).toBe(1);
        expect(filmstripInterval(600)).toBe(4);
        expect(filmstripInterval(601)).toBe(5);
    });
});
