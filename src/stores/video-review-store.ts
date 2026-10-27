import { create } from "zustand";
import { VideoComment } from "@/lib/db-types";

export type CommentSelectionSource = "card" | "link";

interface VideoReviewState {
    videoRefElement: HTMLVideoElement | null,
    // The whole player column goes fullscreen, not just the video.
    playerElement: HTMLElement | null;
    fullscreen: boolean;
    selectedComment: VideoComment | null;
    // Where the selection came from; null once it is cleared.
    selectionSource: CommentSelectionSource | null;
    activeComments: VideoComment[];

    setSelectComment: (comment: VideoComment | null, source?: CommentSelectionSource) => void;
    setVideoRefElement: (video: HTMLVideoElement | null) => void;
    setPlayerElement: (player: HTMLElement | null) => void;
    // Records what the browser reports; toggleFullscreen is what asks the browser to change it.
    setFullscreen: (active: boolean) => void;
    toggleFullscreen: () => void;
    setActiveComments: (comments: VideoComment[]) => void;
}

// Missing from TypeScript's DOM typings because Safari has no lock.
type LockableOrientation = ScreenOrientation & { lock?: (orientation: "landscape") => Promise<void> };

export const useVideoReviewStore = create<VideoReviewState>((set, get) => ({
    videoRefElement: null,
    playerElement: null,
    fullscreen: false,
    selectedComment: null,
    selectionSource: null,
    activeComments: [],

    setSelectComment: (comment, source) => set({ selectedComment: comment, selectionSource: comment ? source ?? null : null }),
    setVideoRefElement: (video) => set({ videoRefElement: video }),
    setPlayerElement: (player) => set({ playerElement: player }),
    setFullscreen: (active) => set({ fullscreen: active }),
    toggleFullscreen: () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
            return;
        }
        const player = get().playerElement;
        if (!player) {
            return;
        }
        // Phones are turned landscape; desktops reject the lock, and exiting fullscreen releases it.
        player.requestFullscreen()
            .then(() => (screen.orientation as LockableOrientation).lock?.("landscape"))
            .catch(() => {});
    },
    setActiveComments: (comment) => set({ activeComments: comment }),
}));
