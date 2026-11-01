import { useMemo, useRef, useState, type ComponentProps, type MouseEvent } from "react";
import type { VideoWithRevision } from "@/lib/db-types";
import { isMac } from "@/lib/platform";
import { visibleNodes } from "@/components/review/browser/video-tree/folder-tree";
import type { FolderList } from "@/components/review/browser/video-tree/use-folder-list";
import type { MoveSource } from "@/components/review/browser/video-tree/organize-tree/hooks/operations/movers";
import { folderNodeKey, itemNodeKey, parseNodeKey, type NodeKey } from "@/components/review/browser/video-tree/organize-tree/node-keys";

type PickProps = ComponentProps<"button"> & { "data-selected": boolean };

// Shift picks a range; ⌘ on a Mac (where Ctrl+click is a right click), or Ctrl elsewhere, adds one.
const isPickClick = (e: MouseEvent) => e.shiftKey || (isMac() ? e.metaKey : e.ctrlKey);

// Items and folders picked for moving, as in Explorer and Finder.
export function useSelection({ root, isOpen }: Pick<FolderList, "root" | "isOpen">, videos: VideoWithRevision[]) {
    const [selected, setSelected] = useState<NodeKey[]>([]);
    // Where a Shift range starts: the last node clicked without Shift.
    const anchor = useRef<NodeKey | null>(null);

    // Every item and folder as shown, top to bottom, for a Shift range.
    const order = useMemo(
        () => visibleNodes(root, isOpen).map((node) => "folder" in node ? folderNodeKey(node.folder.path) : itemNodeKey(node.video.id)),
        [root, isOpen],
    );

    // Only what is in view moves, as in Finder: closing a folder leaves what was picked inside it.
    const pickedSources = useMemo(() => {
        const byId = new Map(videos.map((v) => [v.id, v]));
        const shown = new Set(order);
        return selected.filter((k) => shown.has(k)).flatMap((k): MoveSource[] => {
            const node = parseNodeKey(k);
            if ("folderPath" in node) {
                return [node];
            }

            const video = byId.get(node.videoId);
            return video ? [{ video }] : [];
        });
    }, [selected, videos, order]);

    const pick = (key: NodeKey, e: MouseEvent) => {
        if (e.shiftKey && anchor.current !== null && order.includes(anchor.current)) {
            const from = order.indexOf(anchor.current);
            const to = order.indexOf(key);
            setSelected(order.slice(Math.min(from, to), Math.max(from, to) + 1));
            return;
        }

        anchor.current = key;

        if (isPickClick(e)) {
            setSelected((current) => current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
        } else {
            setSelected([key]);
        }
    };

    const clear = () => {
        anchor.current = null;
        setSelected([]);
    };

    // Shift+click would also select the page's text between the clicks.
    const keepTextUnselected = (e: MouseEvent) => {
        if (e.shiftKey) {
            e.preventDefault();
        }
    };

    // Props for an item, where any click picks.
    const pickItem = (key: NodeKey): PickProps => ({
        onMouseDown: keepTextUnselected,
        onClick: (e) => pick(key, e),
        "data-selected": selected.includes(key),
    });

    // Props for a folder's header, where a plain click opens and closes the folder instead.
    const pickFolder = (key: NodeKey): PickProps => ({
        onMouseDown: keepTextUnselected,
        onClick: (e) => {
            if (isPickClick(e)) {
                e.preventDefault();
                pick(key, e);
            }
        },
        "data-selected": selected.includes(key),
    });

    // What dragging the node moves: everything picked if it is picked, otherwise only itself.
    const dragged = (key: NodeKey, alone: MoveSource): MoveSource[] => {
        return selected.includes(key) ? pickedSources : [alone];
    };

    return { pickItem, pickFolder, dragged, clear };
}
