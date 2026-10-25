import { create } from "zustand";
import { api } from "@/lib/api-client";
import { VideoComment, VideoRevision } from "@/lib/db-types";
import { useAuthStore } from "@/stores/auth-store";
import { useVideoStore } from "@/stores/video-store";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { useCommentSearchStore } from "@/stores/comment-search-store";
import { useCommentSearchDateFilterStore } from "@/stores/date-filter-store";

interface CommentState {
    comments: VideoComment[];
    displayComments: VideoComment[];
    loading: boolean;
    // Videos with comments this user hasn't read, across the whole list.
    unreadVideoIds: ReadonlySet<string>;
    // The list as a live refresh left it; the panel keeps the reader's scroll and read state for it.
    liveComments: VideoComment[] | null;

    setDisplayComments: (comments: VideoComment[]) => void;
    fetchComments: (videoRevision: VideoRevision, options?: { live?: boolean }) => Promise<void>;
    addComment: (c: Omit<VideoComment, "notifiedProviders" | "id" | "createdAt" | "updatedAt" | "deleted" | "drawingPath" | "hasDrawing" | "thumbsUp" | "userId" | "isGuest">) => Promise<string>;
    updateComment: (comment: VideoComment) => void;
    deleteComment: (id: string) => Promise<void>;
    incrementThumbsUpCount: (id: string) => Promise<void>;
    issueLinkedComment: (id: string, issueType: string, screenshot: Blob | null) => Promise<void>;
    loadUnread: () => Promise<void>;
    markRead: (videoId: string) => Promise<void>;
}

export const useCommentStore = create<CommentState>((set, get) => ({
    comments: [],
    displayComments: [],
    loading: false,
    unreadVideoIds: new Set(),
    liveComments: null,
    editingComment: null,

    setDisplayComments: (comments: VideoComment[]) => {
        set({ displayComments: comments })
    },

    fetchComments: async (videoRevision: VideoRevision, options) => {
        const live = options?.live ?? false;
        if (!live) {
            set({ loading: true });
        }

        const s = useCommentSearchStore.getState();
        const dateRange = useCommentSearchDateFilterStore.getState().resolve();
        const res = await api.comments.index.$get({
            query: {
                videoId: videoRevision.videoId,
                selectRevision: String(videoRevision.revision),
                user: s.user || undefined,
                from: dateRange?.from?.toISOString(),
                to: dateRange?.to?.toISOString(),
                hasDrawing: s.hasDrawing ? "true" : undefined,
                hasIssue: s.hasIssue ? "true" : undefined,
                fetchAllComments: s.fetchAllComments ? "true" : undefined,
                filterText: s.filterText || undefined,
            },
        });
        if (res.status !== 200) throw new Error("Failed to fetch comments");
        const comments = await res.json();

        // A switch to another revision while this was on its way has a fetch of its own.
        if (useVideoStore.getState().selectedRevision?.id !== videoRevision.id) {
            return;
        }
        set(live ? { comments, liveComments: comments } : { comments, liveComments: null, loading: false });
    },

    addComment: async (c) => {
        const res = await api.comments.index.$post({ json: c });
        if (res.status !== 201) throw new Error("Failed to create comment");
        const newComment = await res.json();
        set({ comments: [...get().comments, newComment].sort((a, b) => a.time - b.time) });
        return newComment.id;
    },

    updateComment: async (comment) => {
        set({
            comments: get().comments.map((c) => (c.id === comment.id ? comment : c)),
        });
    },

    issueLinkedComment: async (id, issueType, screenshot) => {
        const comment = get().comments.find((c) => c.id === id);
        if (!comment) return;

        const res = await api.comments[":id"].issue.$post({
            param: { id },
            form: {
                baseURL: window.location.origin,
                issueType,
                ...(screenshot ? { file: new File([screenshot], "screenshot.png") } : {}),
            },
        });
        if (res.status === 401) {
            useAuthStore.getState().logout();
            throw new Error("unauthorized");
        }
        if (res.status !== 200) throw new Error("Failed to create issue");
        const updated = await res.json();
        set({
            comments: get().comments.map((c) => (c.id === id ? updated : c)),
        });
    },

    deleteComment: async (id) => {
        const res = await api.comments.index.$patch({ json: { id, deleted: true } });
        if (res.status !== 200) throw new Error("Failed to delete comment");
        set({ comments: get().comments.filter((c) => c.id !== id) });
    },

    incrementThumbsUpCount: async (id) => {
        const res = await api.comments.index.$patch({ json: { id, thumbsUp: true } });
        if (res.status !== 200) throw new Error("Failed to update comment");
        const updated = await res.json();
        set({
            comments: get().comments.map((c) => (c.id === id ? updated : c)),
        });
    },

    loadUnread: async () => {
        const res = await api.readStatus.unread.$get();
        if (res.status !== 200) {
            throw new Error("failed to get unread comment info");
        }
        const { unreadVideoIds } = await res.json();
        set({ unreadVideoIds: new Set(unreadVideoIds) });
    },

    markRead: async (videoId) => {
        const latest = await api.readStatus.latest.$get({ query: { videoId } });
        if (latest.status !== 200) return;
        const { latestCommentId } = await latest.json();
        if (!latestCommentId) return;
        const res = await api.readStatus.index.$post({ json: { videoId, lastReadCommentId: latestCommentId } });

        // The sidebar's unread mark goes away without a reload.
        if (res.ok && get().unreadVideoIds.has(videoId)) {
            const unreadVideoIds = new Set(get().unreadVideoIds);
            unreadVideoIds.delete(videoId);
            set({ unreadVideoIds });
        }
    },
}));
