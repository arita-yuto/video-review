"use client";
import { create } from "zustand";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export type ChatTurn = {
    role: "user" | "assistant";
    content: string;
};

export type ChatSearchError = "notConfigured" | "requestFailed" | "failed";

interface ChatSearchState {
    isOpen: boolean;
    history: ChatTurn[];
    isLoading: boolean;
    error: ChatSearchError | null;
    open: () => void;
    close: () => void;
    sendMessage: (message: string) => Promise<void>;
    clear: () => void;
}

export const useChatSearchStore = create<ChatSearchState>()((set, get) => ({
    isOpen: false,
    history: [],
    isLoading: false,
    error: null,

    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    clear: () => set({ history: [], error: null }),

    sendMessage: async (message: string) => {
        const token = useAuthStore.getState().token;
        if (!token) return;

        const userTurn: ChatTurn = { role: "user", content: message };
        set((s) => ({ history: [...s.history, userTurn], isLoading: true, error: null }));

        try {
            const res = await api.chatSearch.index.$post({ json: { message, history: get().history.slice(0, -1) } });
            if (res.status !== 200) {
                set({ isLoading: false, error: res.status === 503 ? "notConfigured" : res.status === 502 ? "requestFailed" : "failed" });
                return;
            }
            const { reply } = await res.json();
            const assistantTurn: ChatTurn = { role: "assistant", content: reply };
            set((s) => ({ history: [...s.history, assistantTurn], isLoading: false }));
        } catch {
            set({ isLoading: false, error: "failed" });
        }
    },
}));
