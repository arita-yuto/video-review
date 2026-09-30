import { create } from "zustand";
import { VideoComment } from "@/lib/db-types";

interface VideoReviewState {
    videoRefElement: HTMLVideoElement | null,
    selectedComment: VideoComment | null;
    activeComments: VideoComment[];

    setSelectComment: (comment: VideoComment | null) => void;
    setVideoRefElement: (video: HTMLVideoElement | null) => void;
    setActiveComments: (comments: VideoComment[]) => void;
}

export const useVideoReviewStore = create<VideoReviewState>((set) => ({
    videoRefElement: null,
    selectedComment: null,
    activeComments: [],

    setSelectComment: (comment) => set({ selectedComment: comment }),
    setVideoRefElement: (video) => set({ videoRefElement: video }),
    setActiveComments: (comment) => set({ activeComments: comment }),
}));
