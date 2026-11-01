import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EPlayMode = 'normal' | 'loop' | 'next';
export type PlaybackSettingId = "rate" | "resolution" | "playMode";

interface VideoPlayerState {
    volume: number
    volumeEnabled: boolean;
    playMode: EPlayMode,
    playbackRate: number;
    // Preset width to play at; null plays the original file.
    playbackWidth: number | null;
    listPanelOpen: boolean;
    sidePanelOpen: boolean;
    // Settings shown on the control bar as well as in the settings menu.
    barSettings: PlaybackSettingId[];

    setPlaybackRate: (rate: number) => void;
    setPlaybackWidth: (width: number | null) => void;
    setVolume: (vol: number) => void;
    setVolumeEnabled: (enabled: boolean) => void;
    setMode(mode: EPlayMode): void;
    toggleMode: () => void;
    setListPanelOpen: (open: boolean) => void;
    setSidePanelOpen: (open: boolean) => void;
    setBarSetting: (id: PlaybackSettingId, shown: boolean) => void;
}

export const useVideoPlayerStore = create<VideoPlayerState>()(
    persist(
        (set, get) => ({
            volume: 0.3,
            volumeEnabled: true,
            playMode: 'normal',
            playbackRate: 1.0,
            playbackWidth: null,
            listPanelOpen: true,
            sidePanelOpen: true,
            barSettings: [],

            setPlaybackRate: (rate) => set({ playbackRate: rate }),
            setPlaybackWidth: (width) => set({ playbackWidth: width }),
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
            setListPanelOpen: (open) => set({ listPanelOpen: open }),
            setSidePanelOpen: (open) => set({ sidePanelOpen: open }),
            setBarSetting: (id, shown) => set({ barSettings: shown ? [...get().barSettings, id] : get().barSettings.filter((s) => s !== id) }),
        }),
        {
            name: "video-player-store",
            partialize: (state) => ({
                volume: state.volume,
                volumeEnabled: state.volumeEnabled,
                playbackRate: state.playbackRate,
                playbackWidth: state.playbackWidth,
                listPanelOpen: state.listPanelOpen,
                sidePanelOpen: state.sidePanelOpen,
                barSettings: state.barSettings,
            }),
        },
    ),
);
