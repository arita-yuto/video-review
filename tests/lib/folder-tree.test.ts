import { describe, expect, it } from "vitest";
import { VideoWithRevision } from "@/lib/db-types";
import {
    buildFlatFolders,
    buildNestedFolders,
    folderAncestors,
} from "@/components/review/browser/video-tree/folder-tree";

const video = (folderKey: string, title = "Cut") =>
    ({ id: `${folderKey}/${title}`, title, folderKey, latestRevision: null }) as VideoWithRevision;

describe("buildNestedFolders", () => {
    it("folds a chain of folders that only hold one folder into a single node", () => {
        const root = buildNestedFolders([video("Main/Chapter09/Abyss/Event"), video("Main/Chapter09/Abyss/Boss")]);

        const [abyss] = root.folders;
        expect(abyss.names).toEqual(["Main", "Chapter09", "Abyss"]);
        expect(abyss.path).toBe("Main/Chapter09/Abyss");
        expect(abyss.folders.map((f) => f.names)).toEqual([["Boss"], ["Event"]]);
    });

    it("stops folding at a folder that holds videos of its own", () => {
        const root = buildNestedFolders([video("a"), video("a/b/c")]);

        const [a] = root.folders;
        expect(a.names).toEqual(["a"]);
        expect(a.videos).toHaveLength(1);
        expect(a.folders.map((f) => f.names)).toEqual([["b", "c"]]);
    });

    it("keeps a lone top-level folder as a header instead of folding it into the list itself", () => {
        const root = buildNestedFolders([video("Main/Cutscene")]);

        expect(root.names).toEqual([]);
        expect(root.videos).toEqual([]);
        expect(root.folders.map((f) => f.names)).toEqual([["Main", "Cutscene"]]);
    });

    it("orders folders and titles by their numbers, so 2 comes before 10", () => {
        const root = buildNestedFolders([
            video("Chapter10"),
            video("Chapter2"),
            video("Chapter1/Event", "Cut10"),
            video("Chapter1/Event", "Cut2"),
        ]);

        expect(root.folders.map((f) => f.path)).toEqual(["Chapter1/Event", "Chapter2", "Chapter10"]);
        expect(root.folders[0].videos.map((v) => v.title)).toEqual(["Cut2", "Cut10"]);
    });

    it("counts every video under a folder, nested ones included", () => {
        const root = buildNestedFolders([video("Main/A"), video("Main/A"), video("Main/B/C"), video("Main")]);

        const [main] = root.folders;
        expect(main.allVideos).toHaveLength(4);
    });
});

describe("buildFlatFolders", () => {
    it("gives each folder that holds videos one section, with a subfolder right after its parent", () => {
        const root = buildFlatFolders([video("a-b"), video("a/b"), video("a")]);

        expect(root.folders.map((f) => f.path)).toEqual(["a", "a/b", "a-b"]);
        expect(root.folders.every((f) => f.folders.length === 0)).toBe(true);
    });

    it("shortens a deep path in the middle and keeps where it starts and ends", () => {
        const root = buildFlatFolders([video("Main/Chapter09/Abyss/Floor3/Boss")]);

        expect(root.folders[0].names).toEqual(["Main", "…", "Abyss", "Floor3", "Boss"]);
    });
});

describe("folderAncestors", () => {
    it("lists every folder on the way down, so each can be opened to reveal a video", () => {
        expect(folderAncestors("a/b/c")).toEqual(["a", "a/b", "a/b/c"]);
    });
});
