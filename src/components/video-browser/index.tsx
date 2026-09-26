"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, SidebarContent, SidebarFooter } from "@/ui/sidebar"
import { SettingPopover } from "@/components/setting";
import VideoUploadDialog from "@/components/dialog/video-upload";
import VideoListPanelHeader from "@/components/video-browser/header";
import { VideoSearchDialog } from "@/components/dialog/video-search";
import VideoThumbnailsPanel from "@/components/video-browser/video-thumbnails-panel";
import VideoFoldersTree from "@/components/video-browser/video-folders-tree";
import { useVideoStore } from "@/stores/video-store";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api-client";
import { useDrawingStore } from "@/stores/drawing-store";
import DrawingToolPanel from "@/components/drawing-tool-panel";

export default function VideoListPanel() {
    const router = useRouter();
    const { userId } = useAuthStore();
    const { videos, fetchVideos, selectedVideo } = useVideoStore();
    const [searchDialogOpen, setSearchDialogOpen] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
    const [unReadVideoIds, setUnReadVideoIds] = useState<string[]>([]);
    const canvasEditing = useDrawingStore((s) => s.canvasEditing);

    useEffect(() => {
        void (async () => {
            await fetchVideos();
        })();
    }, [])

    useEffect(() => {
        if (!userId) {
            setUnReadVideoIds([]);
            return;
        }

        let cancelled = false;

        api.readStatus.unread.$get({ query: { userId } }).then(async (res) => {
            if (res.status !== 200) throw new Error("failed to get unread comment info");
            const { unreadVideoIds } = await res.json();
            if (!cancelled) setUnReadVideoIds(unreadVideoIds);
        }).catch((reason) => {
            cancelled = true;
            console.error(reason);
        });

        return () => {
            cancelled = true;
        };
    }, [userId]);

    return (
        <>
            <Sidebar>
                {/* While a drawing is being edited the sidebar shows the tool panel instead. The list
                    is hidden, not unmounted: its header refetches videos on mount, reloading the player. */}
                {canvasEditing && <DrawingToolPanel />}
                <div className={canvasEditing ? "hidden" : "contents"}>
                    <VideoListPanelHeader
                        onSearchDialogShow={() => setSearchDialogOpen(true)}
                        onUploadDialogShow={() => setUploadDialogOpen(true)}
                        onThumbnailsToggle={() => setThumbnailsOpen((open) => !open)}
                        thumbnailsOpen={thumbnailsOpen}
                    />

                    <SidebarContent>
                        <VideoFoldersTree
                            videos={videos}
                            unReadVideoIds={unReadVideoIds}
                            selectedVideoId={selectedVideo?.id ?? null}
                            onSelectVideo={(id) => {
                                router.replace(`/video-review/review/${id}`);
                            }}
                        />
                    </SidebarContent>

                    <SidebarFooter>
                        <SettingPopover />
                    </SidebarFooter>
                </div>

                <VideoSearchDialog open={searchDialogOpen} onClose={() => setSearchDialogOpen(false)} />
                <VideoUploadDialog open={uploadDialogOpen} onClose={async (uploadedVideoId) => {
                    setUploadDialogOpen(false);
                    await fetchVideos();

                    // The tree is virtualised and a new folder can land outside the rendered
                    // window, so selecting the video brings it into view.
                    if (uploadedVideoId) {
                        router.replace(`/video-review/review/${uploadedVideoId}`);
                    }
                }} />
            </Sidebar>

            <VideoThumbnailsPanel
                open={thumbnailsOpen}
                videos={videos}
                unReadVideoIds={unReadVideoIds}
                selectedVideoId={selectedVideo?.id}
                onSelectVideo={(id) => {
                    router.replace(`/video-review/review/${id}`);
                }}
                onClose={() => setThumbnailsOpen(false)}
            />
        </>
    );
}
