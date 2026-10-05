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

    setDisplayComments: (comments: VideoComment[]) => void;
    fetchComments: (videoRevision: VideoRevision) => Promise<void>;
    addComment: (c: Omit<VideoComment, "notifiedProviders" | "id" | "createdAt" | "updatedAt" | "deleted" | "drawingPath" | "thumbsUp" | "userId">) => Promise<string>;
    updateComment: (comment: VideoComment) => void;
    deleteComment: (id: string) => Promise<void>;
    incrementThumbsUpCount: (id: string) => Promise<void>;
    issueLinkedComment: (id: string, email: string, issueType: string, screenshot: Blob | null) => Promise<void>;
    markRead: (userId: string, videoId: string) => Promise<void>;
}

export const useCommentStore = create<CommentState>((set, get) => ({
    comments: [],
    displayComments: [],
    loading: false,
    editingComment: null,

    setDisplayComments: (comments: VideoComment[]) => {
        set({ displayComments: comments })
    },

    fetchComments: async (videoRevision: VideoRevision) => {
        set({ loading: true });
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
        set({ comments: await res.json(), loading: false });
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

    issueLinkedComment: async (id, email, issueType, screenshot) => {
        const comment = get().comments.find((c) => c.id === id);
        if (!comment) return;

        const res = await api.comments[":id"].issue.$post({
            param: { id },
            form: {
                baseURL: window.location.origin,
                issueType,
                reporterEmail: email,
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

    markRead: async (userId, videoId) => {
        const latest = await api.readStatus.latest.$get({ query: { videoId } });
        if (latest.status !== 200) return;
        const { latestCommentId } = await latest.json();
        if (!latestCommentId) return;
        await api.readStatus.index.$post({ json: { userId, videoId, lastReadCommentId: latestCommentId } });
    },
}));
