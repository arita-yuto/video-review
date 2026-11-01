import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThumbnailGridStore {
    thumbSize: number;
    setThumbSize: (size: number) => void;

    /** storage key -> media URL; undefined means resolved but absent. Misses are kept for the session. */
    urls: Map<string, string | undefined>;
    cacheUrl: (key: string, url: string | undefined) => void;
    /** Drop a URL that stopped working (expired presign) so the next use re-resolves it. */
    forgetUrl: (key: string) => void;
}

// Lives outside the grid component because the float panel unmounts on close.
// Only thumbSize is persisted: media URLs may be presigned and expire.
export const useThumbnailGridStore = create<ThumbnailGridStore>()(
    persist(
        (set) => ({
            thumbSize: 160,
            setThumbSize: (thumbSize) => set({ thumbSize }),

            urls: new Map(),
            cacheUrl: (key, url) =>
                set((state) => {
                    const urls = new Map(state.urls);
                    urls.set(key, url);
                    return { urls };
                }),
            forgetUrl: (key) =>
                set((state) => {
                    const urls = new Map(state.urls);
                    urls.delete(key);
                    return { urls };
                }),
        }),
        {
            name: "thumbnail-grid",
            partialize: (state) => ({ thumbSize: state.thumbSize }),
        },
    ),
);
