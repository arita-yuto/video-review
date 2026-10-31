import { create } from "zustand";
import { api } from "@/lib/api-client";
import { VideoRevision, VideoEventWithKind } from "@/lib/db-types";
import { useVideoEventSearchStore } from "@/components/review/side-panel/event-panel/stores/video-event-search-store";

export async function fetchVideoEvents(data: {
    videoId: string;
    selectRevision: number;
    filterText?: string;
    kind?: string;
    hasLink?: boolean;
}): Promise<VideoEventWithKind[]> {
    const res = await api.videos[":id"].events.$get({
        param: { id: data.videoId },
        query: {
            selectRevision: String(data.selectRevision),
            filterText: data.filterText || undefined,
            kind: data.kind || undefined,
            hasLink: data.hasLink ? "true" : undefined,
        },
    });
    if (res.status !== 200) throw new Error("Failed to fetch events");
    // links is a JSON column; its element shape is only known on this side.
    return (await res.json()) as VideoEventWithKind[];
}

interface VideoEventState {
    events: VideoEventWithKind[];
    loading: boolean;

    clearEvents: () => void;
    fetchEvents: (videoRevision: VideoRevision) => Promise<void>;
}

export const useVideoEventStore = create<VideoEventState>((set) => ({
    events: [],
    loading: false,

    clearEvents: () => {
        set({ events: [] });
    },

    fetchEvents: async (videoRevision) => {
        set({ loading: true });
        const s = useVideoEventSearchStore.getState();
        const events = await fetchVideoEvents({
            videoId: videoRevision.videoId,
            selectRevision: videoRevision.revision,
            filterText: s.filterText,
            kind: s.kind,
            hasLink: s.hasLink,
        });
        set({ events, loading: false });
    },
}));
