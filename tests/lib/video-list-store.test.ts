import { beforeEach, describe, expect, it } from "vitest";
import { useVideoListStore } from "@/components/review/browser/stores/video-list-store";

const at = (day: number, hour: number) => new Date(2026, 9, day, hour);

describe("recordVisit", () => {
    beforeEach(() => {
        useVideoListStore.setState({ visitDay: null, firstVisitAt: null, previousVisitAt: null });
    });

    it("has no previous visit on the first day", () => {
        useVideoListStore.getState().recordVisit(at(5, 9));

        expect(useVideoListStore.getState().previousVisitAt).toBeNull();
    });

    it("takes the earlier day's first visit, not its last, so late uploads that day still count as new", () => {
        const { recordVisit } = useVideoListStore.getState();
        recordVisit(at(5, 9));
        recordVisit(at(5, 18));
        recordVisit(at(6, 10));

        expect(useVideoListStore.getState().previousVisitAt).toBe(at(5, 9).getTime());
    });

    it("keeps the previous visit when the list is reopened later the same day", () => {
        const { recordVisit } = useVideoListStore.getState();
        recordVisit(at(5, 9));
        recordVisit(at(6, 10));
        recordVisit(at(6, 15));

        expect(useVideoListStore.getState().previousVisitAt).toBe(at(5, 9).getTime());
    });
});

describe("renameFolderPaths", () => {
    beforeEach(() => {
        useVideoListStore.setState({ openPaths: ["a", "a/b", "ab"], newFolders: ["a/n"] });
    });

    it("keeps a renamed folder and the folders under it open, but not one that only starts with the same letters", () => {
        useVideoListStore.getState().renameFolderPaths("a", "x");

        expect(useVideoListStore.getState().openPaths).toEqual(["x", "x/b", "ab"]);
    });

    it("takes the new folders inside it along", () => {
        useVideoListStore.getState().renameFolderPaths("a", "x");

        expect(useVideoListStore.getState().newFolders).toEqual(["x/n"]);
    });
});

describe("fillNewFolder", () => {
    it("forgets a new folder and the new ones above it once something is moved in, but not the ones beside it", () => {
        useVideoListStore.setState({ newFolders: ["n", "n/m", "n/k", "o"] });

        useVideoListStore.getState().fillNewFolder("n/m");

        expect(useVideoListStore.getState().newFolders).toEqual(["n/k", "o"]);
    });
});
