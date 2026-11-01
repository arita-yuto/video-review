import { useEffect } from "react";
import { useVideoReviewStore } from "@/components/review/stores/video-review-store";

// Syncs the store with fullscreenchange events.
// Browser F11 fullscreen is not tracked.
export function useFullscreenSync() {
    const setFullscreen = useVideoReviewStore((s) => s.setFullscreen);

    useEffect(() => {
        const onFullscreenChange = () => {
            const player = useVideoReviewStore.getState().playerElement;
            setFullscreen(player !== null && document.fullscreenElement === player);
        };

        // Re-sync on mount in case the player was unmounted before fullscreenchange fired.
        onFullscreenChange();
        document.addEventListener("fullscreenchange", onFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, [setFullscreen]);
}
