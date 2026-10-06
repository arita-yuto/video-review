import { VideoWithRevision } from "@/lib/db-types";

export type VideoSection = {
    folderKey: string;
    videos: VideoWithRevision[];
};

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

// Compared segment by segment, so "a/b" stays right after "a" instead of after "a-b" or "a_b".
function byPath(a: string, b: string): number {
    const as = a.split("/");
    const bs = b.split("/");

    for (let i = 0; i < Math.min(as.length, bs.length); i++) {
        const order = byName(as[i], bs[i]);
        if (order !== 0) return order;
    }

    return as.length - bs.length;
}

// One flat section per folder that directly holds videos. Sorting by path keeps siblings
// next to each other, so the hierarchy reads from the headers without nesting them.
export function groupByFolder(videos: VideoWithRevision[]): VideoSection[] {
    const byFolder = new Map<string, VideoWithRevision[]>();

    for (const video of videos) {
        let group = byFolder.get(video.folderKey);
        if (!group) byFolder.set(video.folderKey, group = []);
        group.push(video);
    }

    return [...byFolder.entries()]
        .sort(([a], [b]) => byPath(a, b))
        .map(([folderKey, group]) => ({
            folderKey,
            videos: group.sort((a, b) => byName(a.title, b.title)),
        }));
}

// Deep paths keep their first segment (where) and the last two before the leaf (what);
// the middle collapses to "…".
export function splitFolderPath(folderKey: string): { parent: string[]; leaf: string } {
    const parts = folderKey.split("/").filter(Boolean);
    const leaf = parts.pop() ?? "/";
    const parent = parts.length > 3 ? [parts[0], "…", ...parts.slice(-2)] : parts;

    return { parent, leaf };
}

const TITLE_TAIL = 14;

// Titles in one folder share long prefixes and differ at the end, so the tail must stay visible
// and only the head is allowed to truncate.
export function splitTitle(title: string): { head: string; tail: string } {
    const cut = Math.max(0, title.length - TITLE_TAIL);

    return { head: title.slice(0, cut), tail: title.slice(cut) };
}
