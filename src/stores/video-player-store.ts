import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EPlayMode = 'normal' | 'loop' | 'next';

interface VideoPlayerState {
    volume: number
    volumeEnabled: boolean;
    playMode: EPlayMode,
    playbackRate: number;

    setPlaybackRate: (rate: number) => void;
    setVolume: (vol: number) => void;
    setVolumeEnabled: (enabled: boolean) => void;
    setMode(mode: EPlayMode): void;
    toggleMode: () => void;
}

export const useVideoPlayerStore = create<VideoPlayerState>()(
    persist(
        (set, get) => ({
            volume: 0.3,
            volumeEnabled: true,
            playMode: 'normal',
            playbackRate: 1.0,

            setPlaybackRate: (rate) => set({ playbackRate: rate }),
            setMode: (mode) => set({ playMode: mode }),
            toggleMode: () => {
                const currMode = get().playMode;
                switch(currMode) {
                    case "normal": set({playMode: "loop"});   break;
                    case "loop":   set({playMode: "next"});   break;
                    case "next":   set({playMode: "normal"}); break;
                }
            },
            setVolume: (vol) => set({ volume: vol }),
            setVolumeEnabled: (enabled) => set({ volumeEnabled: enabled }),
        }),
        {
            name: "video-player-store",
            partialize: (state) => ({
                volume: state.volume,
                volumeEnabled: state.volumeEnabled,
                playbackRate: state.playbackRate,
            }),
        },
    ),
);
