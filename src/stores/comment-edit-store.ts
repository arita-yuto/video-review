import { create } from "zustand";
import { api, readError } from "@/lib/api-client";
import { VideoComment } from "@/lib/db-types";
import { useCommentStore } from "@/stores/comment-store";
import { toast } from "sonner";

interface CommentEditState {
    editingComment: VideoComment | null;

    editSave: () => Promise<void>;
    editCancel(): void;

    setEditing(comment: VideoComment | null): void;
    /** Takes the drawing fields from the comment as the server returned it after a drawing save. */
    setEditDrawing(saved: VideoComment): void;
    setEditComment(path: string): void;
    setEditIssueId(path: string | null): void;
}

export const useCommentEditStore = create<CommentEditState>((set, get) => ({
    editingComment: null,

    editSave: async () => {
        const editing = get().editingComment;
        if (!editing) return;

        try {
            const res = await api.comments.index.$patch({
                json: {
                    id: editing.id,
                    comment: editing.comment,
                    issueId: editing.issueId,
                },
            });
            if (res.status !== 200) {
                throw new Error(await readError(res));
            }

            // The server's copy, so a key it trimmed is the one the chip looks up.
            const saved = await res.json();
            useCommentStore.getState().updateComment(saved);
            void useCommentStore.getState().fetchIssues(saved.videoId);
            set({ editingComment: null });
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to update comment");
        }
    },
    editCancel: () => set({ editingComment: null }),

    setEditing: (comment) => set({ editingComment: comment }),
    setEditDrawing: (saved) =>
        set((state) => {
            if (!state.editingComment) return state;
            return {
                editingComment: { ...state.editingComment, drawingPath: saved.drawingPath, hasDrawing: saved.hasDrawing, updatedAt: saved.updatedAt },
            };
        }),

    setEditComment: (text) =>
        set((state) => {
            if (!state.editingComment) return state;
            return {
                editingComment: { ...state.editingComment, comment: text },
            };
        }),

    setEditIssueId: (id) =>
        set((state) => {
            if (!state.editingComment) return state;
            return {
                editingComment: { ...state.editingComment, issueId: id },
            };
        }),
}));
