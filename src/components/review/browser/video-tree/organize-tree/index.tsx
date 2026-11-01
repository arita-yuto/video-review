"use client";

import { useTranslations } from "next-intl";
import { FolderRoot } from "lucide-react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { VideoTree } from "@/components/review/browser/video-tree";
import { VideoItemField } from "@/components/review/browser/video-tree/nodes/item/video-item";
import { FolderHeaderButton, FolderHeaderField } from "@/components/review/browser/video-tree/nodes/folder/folder-header";
import type { FolderNode } from "@/components/review/browser/video-tree/folder-tree";
import { useFolderList } from "@/components/review/browser/video-tree/use-folder-list";
import { MoveDialog } from "@/components/review/browser/video-tree/organize-tree/move-dialog";
import { NewFolderAction, OrganizeItemButton, RenameAction } from "@/components/review/browser/video-tree/organize-tree/item";
import { RenameInput } from "@/components/controls/rename-input";
import { folderNodeKey, itemNodeKey, type NodeKey } from "@/components/review/browser/video-tree/organize-tree/node-keys";
import { useAllVideos } from "@/components/review/browser/video-tree/organize-tree/hooks/use-all-videos";
import { useFolderDrop } from "@/components/review/browser/video-tree/organize-tree/hooks/use-folder-drop";
import { useNewFolders } from "@/components/review/browser/video-tree/organize-tree/hooks/use-new-folders";
import { useRenaming } from "@/components/review/browser/video-tree/organize-tree/hooks/use-renaming";
import { TOP, type MoveSource } from "@/components/review/browser/video-tree/organize-tree/hooks/operations/movers";
import { useSelection } from "@/components/review/browser/video-tree/organize-tree/hooks/use-selection";
import { useVideoListStore } from "@/components/review/browser/stores/video-list-store";
import { useVideoStore } from "@/components/stores/video-store";

export function OrganizeTree() {
    const t = useTranslations("video-list-panel.organize");
    const { videos, reload } = useAllVideos();
    const newFolders = useNewFolders(videos);
    // Every folder gets its own node, so each one can be dropped on and renamed.
    const folderList = useFolderList(videos, { compact: false, emptyFolders: newFolders.paths });
    const { reveal } = folderList;

    // The browsing list catches up when the mode ends, or here if it ended while saving.
    const readBack = () => {
        const reading = reload().catch((reason) => console.error(reason));
        if (!useVideoListStore.getState().organizing) {
            void useVideoStore.getState().reloadOnDataChange();
        }
        return reading;
    };

    const { pickItem, pickFolder, dragged, clear } = useSelection(folderList, videos);

    // A renamed folder's key is stale, and so would be those of everything picked inside it.
    const { editing, start, renameOn, renameVideo, renameFolder, renameNewFolder } = useRenaming(videos, () => {
        clear();
        return readBack();
    });

    // Opens where it went, so the moved video or folder is in view.
    const { dragFrom, dropOn, dropOnTop, target: dropTarget, moveDialog } = useFolderDrop({
        videos,
        reveal,
        onMoved: (path) => {
            clear();
            reveal(path);
            void readBack();
        },
    });

    const makeFolder = (parent: string) => {
        reveal(parent);
        start(folderNodeKey(newFolders.add(parent)));
    };

    // A new folder holds nothing to move, and the server would refuse it as missing.
    const moved = (key: NodeKey, alone: MoveSource) =>
        dragged(key, alone).filter((s) => !("folderPath" in s && newFolders.isNew(s.folderPath)));

    const renderItem = (video: VideoWithRevision) => {
        const key = itemNodeKey(video.id);

        return (
            <SidebarMenuItem>
                {editing(key) ? (
                    <VideoItemField video={video}>
                        <RenameInput {...renameVideo(video)} />
                    </VideoItemField>
                ) : (
                    <>
                        <OrganizeItemButton
                            {...renameOn(key)}
                            {...pickItem(key)}
                            {...dragFrom(moved(key, { video }))}
                            {...dropOn(video.folderKey)}
                            video={video}
                        />
                        <RenameAction onClick={() => start(key)} />
                    </>
                )}
            </SidebarMenuItem>
        );
    };

    const renderHeader = (folder: FolderNode, open: boolean, siblings: FolderNode[]) => {
        const key = folderNodeKey(folder.path);
        const isNew = newFolders.isNew(folder.path);

        if (editing(key)) {
            return (
                <FolderHeaderField open={open}>
                    <RenameInput {...(isNew ? renameNewFolder(folder, siblings, newFolders) : renameFolder(folder, siblings))} />
                </FolderHeaderField>
            );
        }

        return (
            <>
                <FolderHeaderButton
                    {...renameOn(key)}
                    {...pickFolder(key)}
                    {...(isNew ? {} : dragFrom(moved(key, { folderPath: folder.path })))}
                    {...dropOn(folder.path)}
                    data-drop-target={dropTarget === folder.path}
                    names={folder.names}
                    path={folder.path}
                    open={open}
                    total={folder.allVideos.length}
                />
                <NewFolderAction onClick={() => makeFolder(folder.path)} />
                <RenameAction onClick={() => start(key)} />
            </>
        );
    };

    return (
        <VideoTree folders={folderList} slot="organize-tree" header={renderHeader} item={renderItem}>
            <SidebarMenuItem>
                <SidebarMenuButton {...dropOnTop()}>
                    <FolderRoot className="text-primary" />
                    <span>{t("top")}</span>
                </SidebarMenuButton>
                <NewFolderAction onClick={() => makeFolder(TOP)} />
            </SidebarMenuItem>

            {moveDialog && <MoveDialog {...moveDialog} />}
        </VideoTree>
    );
}
