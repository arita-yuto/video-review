import { describe, expect, it } from "vitest";
import { markerWidth, sourceMarkers, type MarkerSource } from "@/components/review/player/timeline/seek-bar/markers";

const comment = (id: string, time: number, videoRevNum = 1) => ({ id, time, videoRevNum, userName: "user", comment: id });

const source = (...comments: ReturnType<typeof comment>[]): MarkerSource => ({ comments, className: "" });

describe("sourceMarkers", () => {
    // One second is one pixel, and a power of two keeps the offsets exact.
    const DURATION = 1024;
    const WIDTH = 1024;

    it("returns no markers until the bar's width and the video's duration are known", () => {
        expect(sourceMarkers(source(comment("a", 10)), DURATION, 0)).toEqual([]);
        expect(sourceMarkers(source(comment("a", 10)), 0, WIDTH)).toEqual([]);
    });

    it("gives a comment its own marker once it is a marker's width away", () => {
        const width = markerWidth(source());
        const markers = sourceMarkers(
            source(comment("first", 10), comment("near", 10 + width - 1), comment("apart", 10 + width)),
            DURATION,
            WIDTH,
        );

        expect(markers.map((marker) => marker.comments.map((c) => c.id))).toEqual([["first", "near"], ["apart"]]);
        expect(markers.map((marker) => marker.time)).toEqual([10, 10 + width]);
    });

    it("gathers comments past the video's end into one marker at the end of the bar", () => {
        const markers = sourceMarkers(source(comment("inside", 10), comment("past", DURATION + 100), comment("far", DURATION * 2)), DURATION, WIDTH);

        expect(markers.map((marker) => marker.comments.map((c) => c.id))).toEqual([["inside"], ["past", "far"]]);
        expect(markers.map((marker) => marker.fraction)).toEqual([10 / DURATION, 1]);
    });

    it("puts the newest revision first inside a marker", () => {
        const [marker] = sourceMarkers(source(comment("rev1", 10, 1), comment("rev3", 12, 3), comment("rev2", 11, 2)), DURATION, WIDTH);

        expect(marker.comments.map((c) => c.id)).toEqual(["rev3", "rev2", "rev1"]);
    });
});
