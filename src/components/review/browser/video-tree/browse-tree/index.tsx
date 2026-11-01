"use client";

import { useEffect } from "react";
import { Marks } from "@/components/review/browser/marks/marks";
import type { MarkContext } from "@/components/review/browser/marks/use-mark-context";
import { FolderHeaderButton } from "@/components/review/browser/video-tree/nodes/folder/folder-header";
import { BrowseItem } from "@/components/review/browser/video-tree/browse-tree/browse-item";
import { VideoTree } from "@/components/review/browser/video-tree";
import type { FolderList } from "@/components/review/browser/video-tree/use-folder-list";

type Props = {
    folderList: FolderList;
    markContext: MarkContext;
    selectedVideoId: string | null;
    onSelectVideo: (videoId: string) => void;
};

export function BrowseTree({ folderList, markContext, selectedVideoId, onSelectVideo }: Props) {
    const { root, reveal } = folderList;

    // A video opened from elsewhere (URL, auto-play next, upload) is revealed; its item scrolls to itself.
    useEffect(() => {
        const video = root.allVideos.find((v) => v.id === selectedVideoId);
        if (video) {
            reveal(video.folderKey);
        }
    }, [selectedVideoId, root, reveal]);

    return (
        <VideoTree
            folders={folderList}
            slot="browse-tree"
            header={(folder, open) => (
                <FolderHeaderButton
                    names={folder.names}
                    path={folder.path}
                    open={open}
                    total={folder.allVideos.length}
                    marks={<Marks videos={folder.allVideos} scope="folder" context={markContext} />}
                />
            )}
            item={(video) => (
                <BrowseItem
                    video={video}
                    selected={video.id === selectedVideoId}
                    marks={<Marks videos={[video]} scope="video" context={markContext} />}
                    onSelect={onSelectVideo}
                />
            )}
        />
    );
}
