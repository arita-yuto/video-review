import { VideoWithRevision } from "@/lib/db-types";

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

// Compared segment by segment, so "a/b" stays right after "a" instead of after "a-b" or "a_b".
function byPath(a: string, b: string): number {
    const as = a.split("/");
    const bs = b.split("/");

    for (let i = 0; i < Math.min(as.length, bs.length); i++) {
        const order = byName(as[i], bs[i]);
        if (order !== 0) {
            return order;
        }
    }

    return as.length - bs.length;
}

export type FolderNode = {
    // More than one name when folders holding only a single folder were folded into this node.
    names: string[];
    path: string;
    folders: FolderNode[];
    videos: VideoWithRevision[];
    // Every video under this folder, nested ones included, for the header counts.
    allVideos: VideoWithRevision[];
};

type FolderDraft = {
    name: string;
    path: string;
    folders: Map<string, FolderDraft>;
    videos: VideoWithRevision[];
};

const folderNames = (folderKey: string) => folderKey.split("/").filter(Boolean);

// The folders as a tree, opened one level at a time while browsing. Organizing turns `compact`
// off, so every folder has its own header to drop onto, and adds the empty folders it has made.
export function buildNestedFolders(
    videos: VideoWithRevision[],
    { compact = true, emptyFolders = [] }: { compact?: boolean; emptyFolders?: string[] } = {},
): FolderNode {
    const root: FolderDraft = { name: "", path: "", folders: new Map(), videos: [] };

    const folderAt = (folderKey: string) => {
        let draft = root;

        for (const name of folderNames(folderKey)) {
            let child = draft.folders.get(name);
            if (!child) {
                child = { name, path: draft.path ? `${draft.path}/${name}` : name, folders: new Map(), videos: [] };
                draft.folders.set(name, child);
            }
            draft = child;
        }

        return draft;
    };

    for (const video of videos) {
        folderAt(video.folderKey).videos.push(video);
    }

    for (const path of emptyFolders) {
        folderAt(path);
    }

    // The root has no header of its own, so it never folds into its only child.
    return finishFolder(root, [], compact);
}

// One flat section per folder that directly holds videos, for filter results. Sorting by path
// keeps siblings next to each other, so the hierarchy reads from the headers without nesting.
export function buildFlatFolders(videos: VideoWithRevision[]): FolderNode {
    const byFolder = new Map<string, VideoWithRevision[]>();

    for (const video of videos) {
        let group = byFolder.get(video.folderKey);
        if (!group) {
            byFolder.set(video.folderKey, group = []);
        }
        group.push(video);
    }

    const folders = [...byFolder.entries()]
        .sort(([a], [b]) => byPath(a, b))
        .map(([folderKey, group]): FolderNode => {
            const sorted = group.sort((a, b) => byName(a.title, b.title));
            return { names: shortenFolderPath(folderKey), path: folderKey, folders: [], videos: sorted, allVideos: sorted };
        });

    return { names: [], path: "", folders, videos: [], allVideos: folders.flatMap((f) => f.allVideos) };
}

// A chain of folders that each hold just one folder and no videos reads as one node,
// as VS Code's compact folders do, so a deep but narrow path costs a single level.
function compactFolder(draft: FolderDraft): FolderNode {
    const names = [draft.name];

    while (draft.folders.size === 1 && draft.videos.length === 0) {
        draft = draft.folders.values().next().value!;
        names.push(draft.name);
    }

    return finishFolder(draft, names, true);
}

function finishFolder(draft: FolderDraft, names: string[], compact: boolean): FolderNode {
    const folders = [...draft.folders.values()]
        .sort((a, b) => byName(a.name, b.name))
        .map((child) => compact ? compactFolder(child) : finishFolder(child, [child.name], false));
    const videos = draft.videos.sort((a, b) => byName(a.title, b.title));

    return {
        names,
        path: draft.path,
        folders,
        videos,
        allVideos: [...videos, ...folders.flatMap((f) => f.allVideos)],
    };
}

export type VisibleNode = { folder: FolderNode } | { video: VideoWithRevision };

// The headers and videos the list shows, in its order: a folder's contents only while it is open,
// subfolders before videos.
export function visibleNodes(folder: FolderNode, isOpen: (path: string) => boolean): VisibleNode[] {
    const folders = folder.folders.flatMap((f) => {
        const contents = isOpen(f.path) ? visibleNodes(f, isOpen) : [];
        return [{ folder: f }, ...contents];
    });

    return [...folders, ...folder.videos.map((video) => ({ video }))];
}

export function visibleVideos(folder: FolderNode, isOpen: (path: string) => boolean): VideoWithRevision[] {
    return visibleNodes(folder, isOpen).flatMap((node) => "video" in node ? [node.video] : []);
}

// Every folder on the way to a video, so opening them all reveals it whichever nodes were folded.
export function folderAncestors(folderKey: string): string[] {
    const names = folderNames(folderKey);

    return names.map((_, i) => names.slice(0, i + 1).join("/"));
}

// Deep paths keep their first segment (where) and the last two before the leaf (what);
// the middle collapses to "…".
function shortenFolderPath(folderKey: string): string[] {
    const parts = folderNames(folderKey);
    const leaf = parts.pop() ?? "/";
    const parent = parts.length > 3 ? [parts[0], "…", ...parts.slice(-2)] : parts;

    return [...parent, leaf];
}
