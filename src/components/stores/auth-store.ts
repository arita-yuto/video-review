"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api-client";
import { Role } from "@/lib/role";
import { LoginType } from "@/lib/auth-types";

interface AuthState {
    displayName: string | null;
    userId: string | null;
    email: string | null;
    role: Role;
    provider: LoginType | null;
    token: string | null;

    verifyAuth: () => Promise<string | null>;
    setAuth: (
        userId: string,
        email: string | null,
        role: Role,
        token: string,
        displayName: string,
        provider: LoginType,
    ) => void;
    setDisplayName: (name: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            displayName: null,
            userId: null,
            email: null,
            role: "guest",
            provider: null,
            token: null,
            canUseIssueTracker: false,

            verifyAuth: async () => {
                const token = get().token;
                if (!token) return null;

                try {
                    const res = await api.auth.verify.$post({ json: { token } });
                    if (res.status === 200) return (await res.json()).decoded.id;
                } catch {
                    // No answer is not a rejected session, so the token stays.
                    return null;
                }

                get().logout();
                return null;
            },

            setAuth: (userId, email, role, token, displayName, provider) => {
                set({ userId, email, role, token, displayName, provider });
            },

            setDisplayName: (name) => {
                set({displayName: name})
            },

            logout: () => {
                void api.auth.logout.$post().catch(() => {});
                set({ userId: null, token: null, provider: null });
            },
        }),
        {
            name: "auth-store",
        },
    ),
);
