import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface ReloadState {
    videoId: string | null;
    time: number;

    setVideoTime: (videoId: string, time: number) => void;
}

// Kept in sessionStorage, so each browser tab comes back to its own video and time.
export const useReloadStateStore = create<ReloadState>()(
    persist(
        (set) => ({
            videoId: null,
            time: 0,

            setVideoTime: (videoId, time) => set({ videoId, time }),
        }),
        {
            name: "reload-state",
            storage: createJSONStorage(() => sessionStorage),
        },
    ),
);
