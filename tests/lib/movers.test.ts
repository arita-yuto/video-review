import { describe, expect, it } from "vitest";
import type { VideoWithRevision } from "@/lib/db-types";
import { emptiedFolders, planMove, TOP } from "@/components/review/browser/video-tree/organize-tree/hooks/operations/movers";

const video = (id: string, folderKey: string) =>
    ({ id, title: id, folderKey, latestRevision: null }) as VideoWithRevision;

describe("planMove", () => {
    it("refuses the whole move when one video would land on Top", () => {
        const sources = [{ folderPath: "x/a" }, { video: video("1", "b") }];

        expect(planMove(sources, TOP)).toBeNull();
    });

    it("refuses a folder dropped into a folder under itself", () => {
        expect(planMove([{ folderPath: "a" }], "a/b")).toBeNull();
    });

    it("moves a picked folder's videos with the folder, not on their own", () => {
        const sources = [{ folderPath: "a" }, { video: video("1", "a/x") }];

        expect(planMove(sources, "c")).toEqual({ videos: [], folders: [{ from: "a", to: "c/a" }] });
    });

    it("leaves out what is already where it was dropped", () => {
        const sources = [{ video: video("1", "c") }, { video: video("2", "a") }];

        expect(planMove(sources, "c")).toEqual({ videos: [{ id: "2", folderKey: "c" }], folders: [] });
    });
});

describe("emptiedFolders", () => {
    const videos = [video("1", "a/b"), video("2", "a/c"), video("3", "d")];

    it("finds the folder whose last video moves out", () => {
        expect(emptiedFolders(videos, { videos: [{ id: "1", folderKey: "d" }], folders: [] })).toEqual(["a/b"]);
    });

    it("names only the outermost folder when a whole branch empties", () => {
        const request = { videos: [{ id: "1", folderKey: "d" }, { id: "2", folderKey: "d" }], folders: [] };

        expect(emptiedFolders(videos, request)).toEqual(["a"]);
    });

    it("doesn't count a moved folder as emptied, since it goes on under its new path", () => {
        const request = { videos: [], folders: [{ from: "a/b", to: "d/b" }] };

        expect(emptiedFolders([video("1", "a/b"), video("2", "a")], request)).toEqual([]);
    });
});
