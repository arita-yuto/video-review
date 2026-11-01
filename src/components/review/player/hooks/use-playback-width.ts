import { useConfigStore } from "@/components/stores/config-store";
import { useVideoPlayerStore } from "@/components/review/stores/video-player-store";

// The width to play at, or null for the original.
// A saved width that is no longer a preset (changed on the admin screen) counts as the original rather than a missing file.
export function usePlaybackWidth(): number | null {
    const presets = useConfigStore((s) => s.resolutionPresets);
    const width = useVideoPlayerStore((s) => s.playbackWidth);
    return width !== null && presets.includes(width) ? width : null;
}
