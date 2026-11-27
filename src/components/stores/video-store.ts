import { create } from "zustand";
import { Video, VideoRevision, VideoWithRevision } from "@/lib/db-types";
import { useVideoSearchStore } from "@/components/stores/video-search-store";
import { useVideoDateFilterStore, useVideoCommentsDateFilterStore } from "@/components/stores/date-filter-store";
import { api } from "@/api";

interface VideoState {
    videos: VideoWithRevision[];
    allVideoTags: string[],
    selectedVideo: Video | null;
    revisions: VideoRevision[],
    selectedRevision: VideoRevision | null;
    loading: boolean;
    // A video is being fetched for selectVideo.
    opening: boolean;

    reloadOnViewChange: () => Promise<void>;
    reloadOnDataChange: () => Promise<void>;
    setOpening: (opening: boolean) => void;
    selectVideo: (video: Video, revisions: VideoRevision[], revision: VideoRevision | null) => void;
    nextVideo: () => Video | null;
    selectVideoRevision: (revision: VideoRevision) => void;
    updateRevisionTags: (revisionId: string, tags: string[]) => Promise<void>;
    setGuestVisible: (videoId: string, value: boolean) => Promise<void>;
}

export const latestRevisionNumber = (s: VideoState) => Math.max(0, ...s.revisions.map((r) => r.revision));

export const useVideoStore = create<VideoState>((set, get) => ({
    videos: [],
    allVideoTags: [],
    selectedVideo: null,
    revisions: [],
    selectedRevision: null,
    loading: false,
    opening: false,

    // When what the list shows changes (first load, search, filters): reload the list, with the loading state on screen.
    async reloadOnViewChange() {
        set({ loading: true });
        const { videos, tags } = await queryVideos();
        set({ videos, loading: false, allVideoTags: tags });
    },

    // When videos change on the server (upload, delete, move, rename): bring the list and the open video up to date in the background.
    // The loading flag and the open video's objects stay as they are where nothing changed, so the player keeps playing.
    async reloadOnDataChange() {
        try {
            const { videos, tags } = await queryVideos();
            set({ videos, allVideoTags: tags });

            const open = get().selectedVideo;
            if (!open) {
                return;
            }

            const res = await api.videos[":id"].$get({ param: { id: open.id } });
            const video = res.status === 200 ? await res.json() : null;
            if (!video || video.deleted) {
                set({ selectedVideo: null, revisions: [], selectedRevision: null });
                return;
            }

            const revisionsRes = await api.videos[":id"].revisions.$get({ param: { id: open.id } });
            if (revisionsRes.status !== 200) {
                throw new Error("Failed to fetch revisions");
            }
            const revisions = await revisionsRes.json();

            const renamed = video.title !== open.title || video.folderKey !== open.folderKey;
            const watchingKept = revisions.some(r => r.id === get().selectedRevision?.id);
            set({
                revisions,
                ...(renamed ? { selectedVideo: { ...open, title: video.title, folderKey: video.folderKey } } : {}),
                ...(watchingKept ? {} : { selectedRevision: revisions[0] ?? null }),
            });
        } catch (e) {
            // The screen keeps what it showed; the next reload catches up.
            console.error("Failed to reload videos after a change", e);
        }
    },

    setOpening(opening) {
        set({ opening });
    },

    selectVideo(video, revisions, revision) {
        set({ selectedVideo: video, revisions, selectedRevision: revision, opening: false });
    },

    nextVideo() {
        const videos = get().videos;
        const currIndex = videos.findIndex((v) => v.id === get().selectedVideo?.id);

        if (currIndex === -1) {
            return null;
        }

        return videos[currIndex + 1] ?? null;
    },

    selectVideoRevision(revision) {
        set({ selectedRevision: revision });
    },

    async updateRevisionTags(revisionId, tags) {
        const res = await api.videos[":id"].metadata.annotate.$post({
            param: { id: revisionId },
            json: { tags: tags.join(",") },
        });
        if (res.status !== 200) return;
        set((state) => ({
            selectedRevision:
                state.selectedRevision?.id === revisionId
                    ? { ...state.selectedRevision, tags }
                    : state.selectedRevision,
            revisions: state.revisions.map((r) =>
                r.id === revisionId ? { ...r, tags } : r
            ),
        }));
    },

    async setGuestVisible(videoId, value) {
        const res = await api.videos[":id"].$patch({
            param: { id: videoId },
            json: { guestVisible: value },
        });
        if (res.status !== 200) return;
        set((state) => ({
            selectedVideo:
                state.selectedVideo?.id === videoId
                    ? { ...state.selectedVideo, guestVisible: value }
                    : state.selectedVideo,
            videos: state.videos.map((v) =>
                v.id === videoId ? { ...v, guestVisible: value } : v
            ),
        }));
    },
}));

async function queryVideos() {
    const s = useVideoSearchStore.getState();
    const videoDateRange = useVideoDateFilterStore.getState().resolve();
    const commentsDateRange = useVideoCommentsDateFilterStore.getState().resolve();
    const res = await api.videos.index.$get({
        query: {
            videoFrom: videoDateRange?.from?.toISOString(),
            videoTo: videoDateRange?.to?.toISOString(),
            commentsFrom: commentsDateRange?.from?.toISOString(),
            commentsTo: commentsDateRange?.to?.toISOString(),
            user: s.user || undefined,
            filterTree: s.filterTree || undefined,
            filterIssue: s.filterIssue || undefined,
            hasIssue: s.hasIssue ? "true" : undefined,
            hasDrawing: s.hasDrawing ? "true" : undefined,
            hasComment: s.hasComment ? "true" : undefined,
            tags: s.tags.length > 0 ? s.tags.join(",") : undefined,
        },
    });
    if (res.status !== 200) {
        throw new Error("Failed to fetch videos");
    }
    const videos = await res.json();

    const tagsRes = await api.videos.tags.$get();
    const tags = tagsRes.status === 200 ? await tagsRes.json() : [];

    return { videos, tags };
}
