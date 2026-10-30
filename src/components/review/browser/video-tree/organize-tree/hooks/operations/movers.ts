import { useTranslations } from "next-intl";
import { api, readError } from "@/lib/api-client";
import type { VideoWithRevision } from "@/lib/db-types";
import { childPath, folderName, isInFolder, parentPath } from "@/lib/folder-path";
import { folderAncestors } from "@/components/review/browser/video-tree/folder-tree";
import { useVideoListStore } from "@/stores/video-list-store";

// What is being dragged: a video, or a folder by its path.
export type MoveSource = { video: VideoWithRevision } | { folderPath: string };

// The body of POST /videos/move.
export type MoveRequest = { videos: { id: string; folderKey: string }[]; folders: { from: string; to: string }[] };

// The folder path for the top level, where only folders can go: videos always live in a folder.
export const TOP = "";

// The request for dropping the sources on `path`, or null to refuse the drop. The move is all or
// nothing, so one source that can't go there refuses them all.
export function planMove(sources: MoveSource[], path: string): MoveRequest | null {
    const request: MoveRequest = { videos: [], folders: [] };

    // What is inside a picked folder goes with it, so it stays where it is when the folder does.
    const folders = sources.flatMap((s) => "folderPath" in s ? [s.folderPath] : []);
    const inPicked = (key: string, self?: string) => folders.some((f) => f !== self && isInFolder(key, f));
    const outermost = sources.filter((s) => "video" in s
        ? !inPicked(s.video.folderKey)
        : !inPicked(s.folderPath, s.folderPath));

    for (const source of outermost) {
        if ("video" in source) {
            if (path === TOP) {
                return null;
            }

            if (path !== source.video.folderKey) {
                request.videos.push({ id: source.video.id, folderKey: path });
            }
            continue;
        }

        const from = source.folderPath;
        if (path !== TOP && isInFolder(path, from)) {
            return null;
        }

        if (path !== parentPath(from)) {
            request.folders.push({ from, to: childPath(path, folderName(from)) });
        }
    }

    return request.videos.length + request.folders.length === 0 ? null : request;
}

// The outermost folders a move leaves without a video. A folder is only a path in videos' folder
// keys, so these leave the list.
export function emptiedFolders(videos: VideoWithRevision[], request: MoveRequest): string[] {
    const movedVideos = new Map(request.videos.map((v) => [v.id, v.folderKey]));

    const after = videos.map((video) => {
        const key = movedVideos.get(video.id) ?? video.folderKey;
        const folder = request.folders.find((f) => isInFolder(key, f.from));
        return folder ? folder.to + key.slice(folder.from.length) : key;
    });

    const before = new Set(videos.flatMap((v) => folderAncestors(v.folderKey)));
    const kept = new Set(after.flatMap(folderAncestors));
    const movedAway = (path: string) => request.folders.some((f) => isInFolder(path, f.from));
    const emptied = [...before].filter((path) => !kept.has(path) && !movedAway(path));

    return emptied.filter((path) => !emptied.some((other) => other !== path && isInFolder(path, other)));
}

// How organize mode moves videos and folders: the request, and how a refusal reads.
export function useMovers() {
    const t = useTranslations("video-list-panel.organize.move");
    const renameFolderPaths = useVideoListStore((s) => s.renameFolderPaths);
    const fillNewFolder = useVideoListStore((s) => s.fillNewFolder);

    // Sends a planMove() result and returns a reason it was refused, or null once it is moved.
    const move = async (request: MoveRequest): Promise<string | null> => {
        try {
            const res = await api.videos.move.$post({ json: request });
            if (res.status === 409) {
                const { titles } = await res.json();
                return `${t("clash")}: ${titles.join(", ")}`;
            }
            if (res.status !== 200) {
                return `${t("failed")}: ${await readError(res)}`;
            }
        } catch (e) {
            return `${t("failed")}: ${e instanceof Error ? e.message : String(e)}`;
        }

        // A moved folder stays open, with the folders under it, as after a rename.
        for (const folder of request.folders) {
            renameFolderPaths(folder.from, folder.to);
            fillNewFolder(folder.to);
        }

        for (const video of request.videos) {
            fillNewFolder(video.folderKey);
        }
        return null;
    };

    const emptiedMessage = (folders: string[]) => t("emptied", { folders: folders.map(folderName).join(", ") });

    return { move, emptiedMessage };
}
