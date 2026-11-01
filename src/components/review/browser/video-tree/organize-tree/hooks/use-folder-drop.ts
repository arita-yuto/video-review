import { useState } from "react";
import type { VideoWithRevision } from "@/lib/db-types";
import { useDragDrop } from "@/components/review/browser/video-tree/organize-tree/hooks/use-drag-drop";
import { emptiedFolders, planMove, TOP, useMovers, type MoveRequest, type MoveSource } from "@/components/review/browser/video-tree/organize-tree/hooks/operations/movers";

type Options = {
    videos: VideoWithRevision[];
    // Opens a folder and the folders above it, so a closed one can be dropped into.
    reveal: (path: string) => void;
    // Called with the folder the moved videos and folders ended up in.
    onMoved: (folderKey: string) => void;
};

// Items and folder headers are dragged onto folder headers, the Top node, or an item, which stands for the folder it is in, as in Finder.
export function useFolderDrop({ videos, reveal, onMoved }: Options) {
    const { move, emptiedMessage } = useMovers();
    // What the dialog says: a move waiting for a yes before it empties folders, or why one was refused.
    const [notice, setNotice] = useState<{ message: string; confirm?: () => void } | null>(null);

    const send = (request: MoveRequest, path: string) => {
        void move(request).then((refused) => {
            if (refused) {
                setNotice({ message: refused });
                return;
            }

            onMoved(path);
        });
    };

    const drag = useDragDrop<MoveSource[]>({
        accepts: (sources, path) => planMove(sources, path) !== null,
        onDrop: (sources, path) => {
            const request = planMove(sources, path)!;
            const folders = emptiedFolders(videos, request);

            if (folders.length > 0) {
                setNotice({ message: emptiedMessage(folders), confirm: () => send(request, path) });
            } else {
                send(request, path);
            }
        },
        onLinger: reveal,
    });

    const close = () => setNotice(null);
    const confirm = notice?.confirm;

    const moveDialog = notice && {
        message: notice.message,
        onClose: close,
        onConfirm: confirm && (() => {
            confirm();
            close();
        }),
    };

    // Props for the Top node, which only takes folders.
    const dropOnTop = () => ({
        ...drag.dropOn(TOP),
        "data-drop-target": drag.target === TOP,
    });

    return { ...drag, dropOnTop, moveDialog };
}
