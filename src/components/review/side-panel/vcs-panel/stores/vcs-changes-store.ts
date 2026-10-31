import { create } from "zustand";
import { api } from "@/lib/api-client";
import type { VcsChangeSet } from "@/lib/vcs-types";
import type { VideoRevision } from "@/lib/db-types";

interface VcsChangesState {
    data: VcsChangeSet | null;
    loading: boolean;
    error: string | null;
    summary: string | null;
    summaryLoading: boolean;

    fetchChanges: (videoId: string, fromRevision: VideoRevision | null, toRevision: VideoRevision | null, refresh?: boolean) => Promise<void>;
    fetchSummary: (videoId: string, toRevision: VideoRevision | null) => Promise<void>;
    clear: () => void;
}

export const useVcsChangesStore = create<VcsChangesState>((set) => ({
    data: null,
    loading: false,
    error: null,
    summary: null,
    summaryLoading: false,

    fetchChanges: async (videoId, fromRevision, toRevision, refresh) => {
        set({ loading: true, error: null, summary: null });
        try {
            const res = await api.videos[":id"]["vcs-changes"].$get({
                param: { id: videoId },
                query: { from: fromRevision?.id, to: toRevision?.id, refresh: refresh ? "true" : undefined },
            });
            if (res.status !== 200) {
                const body = (await res.json().catch(() => ({}))) as { error?: string };
                throw new Error(body.error ?? `HTTP ${res.status}`);
            }
            // The vcs routes declare no response schema, so the shape is asserted here.
            const data = (await res.json()) as VcsChangeSet;
            set({ data, loading: false });
        } catch (err) {
            set({ error: err instanceof Error ? err.message : String(err), loading: false });
        }
    },

    fetchSummary: async (videoId, toRevision) => {
        set({ summaryLoading: true });
        try {
            const res = await api.videos[":id"]["vcs-summary"].$get({
                param: { id: videoId },
                query: { to: toRevision?.id },
            });
            // Widened on purpose: without a response schema hc does not know 404/503 are possible.
            const status: number = res.status;
            if (status === 503 || status === 404) {
                set({ summary: null, summaryLoading: false });
                return;
            }
            if (status !== 200) throw new Error(`HTTP ${status}`);
            const { summary } = (await res.json()) as { summary: string | null };
            set({ summary, summaryLoading: false });
        } catch {
            set({ summaryLoading: false });
        }
    },

    clear: () => {
        set({ data: null, error: null, summary: null });
    },
}));
