"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import VideoSidePanel from "@/components/review/side-panel";
import VideoCommentContent from "@/components/review/side-panel/comment-panel/content";
import VideoListPanel from "@/components/review/browser";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PlaybackStoreProvider } from "@/components/review/stores/playback-store";
import { useVideoPlayerStore } from "@/components/review/stores/video-player-store";
import { useVideoStore } from "@/components/stores/video-store";

export function ReviewFrame({ children }: { children: ReactNode }) {
    const listPanelOpen = useVideoPlayerStore((s) => s.listPanelOpen);
    const setListPanelOpen = useVideoPlayerStore((s) => s.setListPanelOpen);
    const sidePanelOpen = useVideoPlayerStore((s) => s.sidePanelOpen);
    const isMobile = useIsMobile();
    const latestRevision = useVideoStore((s) => Math.max(0, ...s.revisions.map((r) => r.revision)));

    return (
        <SidebarProvider
            open={listPanelOpen}
            onOpenChange={setListPanelOpen}
            className="h-full"
            style={{ "--revision-latest": latestRevision } as CSSProperties}
        >
            <PlaybackStoreProvider>
                <VideoListPanel />
                {isMobile ? (
                    // A phone stacks the player above the comments; in landscape only the player fits.
                    <div data-slot="review-main" className="w-screen h-full flex flex-col">
                        <div className="shrink-0 min-w-0 landscape:flex-1 landscape:min-h-0">
                            {children}
                        </div>
                        <div className="flex-1 min-h-0 min-w-0 border-t landscape:hidden">
                            <VideoCommentContent />
                        </div>
                    </div>
                ) : (
                    <div data-slot="review-main" className={cn("@container w-screen h-full grid", sidePanelOpen ? "review-columns" : "review-columns-closed")}>
                        <div className="flex flex-col min-h-0 min-w-0 w-full h-full border-r">
                            {children}
                        </div>
                        {/* Kept rather than removed, so a comment being written survives closing it. */}
                        <div inert={!sidePanelOpen} className="min-h-0 min-w-0 h-full overflow-hidden">
                            <div className="side-panel-width h-full flex flex-col border-l">
                                <VideoSidePanel />
                            </div>
                        </div>
                    </div>
                )}
            </PlaybackStoreProvider>
        </SidebarProvider>
    );
}
