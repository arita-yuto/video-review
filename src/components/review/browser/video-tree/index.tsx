import { createContext, Fragment, useRef, type ReactNode, type RefObject } from "react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenu } from "@/components/ui/sidebar";
import { FolderSection } from "@/components/review/browser/video-tree/nodes/folder/folder-section";
import type { FolderNode } from "@/components/review/browser/video-tree/folder-tree";
import type { FolderList } from "@/components/review/browser/video-tree/use-folder-list";

type Props = {
    folders: Pick<FolderList, "root" | "isOpen" | "toggle">;
    slot: string;
    // What a folder's sticky header holds; `siblings` are the folders beside it.
    header: (folder: FolderNode, open: boolean, siblings: FolderNode[]) => ReactNode;
    item: (video: VideoWithRevision) => ReactNode;
    // Nodes above the folders, such as organize's Top.
    children?: ReactNode;
};

// Item thumbnails load as they scroll into this list, not the window.
export const TreeScrollContext = createContext<RefObject<HTMLDivElement | null>>({ current: null });

// The scrolling list of folders and videos that each list fills with its own headers and items.
// Each folder wraps its contents, so its sticky header leaves together with them.
export function VideoTree({ folders, slot, header, item, children }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { root, isOpen, toggle } = folders;

    const renderItem = (video: VideoWithRevision) => (
        <Fragment key={video.id}>{item(video)}</Fragment>
    );

    const renderFolder = (folder: FolderNode, depth: number, siblings: FolderNode[]) => {
        const open = isOpen(folder.path);

        return (
            <FolderSection
                key={folder.path}
                depth={depth}
                open={open}
                onToggle={() => toggle(folder.path)}
                header={header(folder, open, siblings)}
            >
                {folder.folders.map((child) => renderFolder(child, depth + 1, folder.folders))}
                {folder.videos.map((video) => renderItem(video))}
            </FolderSection>
        );
    };

    return (
        <div ref={containerRef} data-slot={slot} className="min-h-0 flex-1 overflow-y-auto">
            <TreeScrollContext value={containerRef}>
                <SidebarMenu>
                    {children}
                    {root.folders.map((folder) => renderFolder(folder, 0, root.folders))}
                    {root.videos.map((video) => renderItem(video))}
                </SidebarMenu>
            </TreeScrollContext>
        </div>
    );
}
