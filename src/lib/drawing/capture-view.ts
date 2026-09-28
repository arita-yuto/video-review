import { captureFrame } from "@/lib/utils";
import { useDrawingStore } from "@/stores/drawing-store";
import { useDrawingSettingsStore } from "@/stores/drawing-settings-store";
import { useVideoReviewStore } from "@/stores/video-review-store";

/**
 * The frame as the player shows it, with the drawing on top when the switch is on.
 * Every screenshot (saved, Jira, chat) goes through here, so one switch decides for all of them.
 */
export function captureView(): Promise<Blob | null> {
    const video = useVideoReviewStore.getState().videoRefElement;
    const overlay = useDrawingSettingsStore.getState().captureDrawing
        ? useDrawingStore.getState().canvasRefElement
        : null;
    return captureFrame(video, overlay);
}
