/**
 * Avatar fetching is intentionally centralized in this store.
 *
 * Reasons:
 * - Avatar sources differ in nature (local URL vs external binary data).
 * - External avatars (Slack / Jira) require authenticated fetch
 *   and must be converted into object URLs on the client.
 * - The UI layer should not care about *where* the avatar comes from.
 *
 * This store acts as a resolver and cache, exposing a single `icon(email)`
 * interface to consumers.
 */
"use client";
import { api } from "@/lib/api-client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

async function fetchLocal(email: string): Promise<string | undefined> {
    const res = await api.avatar.local.$get({ query: { email } });
    if (res.status !== 200) return undefined;
    return (await res.json()).avatarUrl;
}

async function fetchIntegration(email: string): Promise<string | undefined> {
    const res = await api.avatar.integration.$get({ query: { email } });
    if (!res.ok) return undefined;

    const blob = await res.blob();
    if (blob.size === 0) return undefined;

    return URL.createObjectURL(blob);
}

interface AvatarCacheEntry {
    icon: string | undefined;
    fetched: boolean;
}

interface AvatarState {
    cache: Map<string, AvatarCacheEntry>;
    inflight: Map<string, Promise<void> | undefined>;

    fetchAvatar: (email: string) => Promise<void>;
    icon: (email: string) => string | undefined;
}

export const useAvatarStore = create<AvatarState>()((set, get) => ({
    cache: new Map<string, AvatarCacheEntry>(),
    inflight: new Map<string, Promise<void>>(),

    async fetchAvatar(email: string) {
        if (!email) return;

        const { cache, inflight } = get();

        if (cache.get(email)?.fetched) {
            return;
        }

        if (inflight.has(email)) {
            return inflight.get(email);
        }

        const task = (async () => {
            try {
                /**
                 * Fetch order is important.
                 *
                 * 1. Local avatar:
                 *    - Cheap to access
                 *    - Stable URL
                 *    - No authentication required
                 *    - Can be reused across sessions
                 *
                 * 2. Integration avatar (Slack / Jira):
                 *    - Requires authenticated API calls
                 *    - Returned as binary data
                 *    - Converted to an object URL (session-scoped)
                 *    - More expensive and less stable
                 *
                 * Therefore, local avatars are always preferred when available.
                 */
                const fetchers = [
                    () => fetchLocal(email),
                    () => fetchIntegration(email),
                ];

                for (const fetcher of fetchers) {
                    const icon = await fetcher();
                    if (icon) {
                        set((state) => {
                            const next = new Map(state.cache);
                            next.set(email, { icon, fetched: true });
                            return { cache: next };
                        });
                        return;
                    }
                }

                set((state) => {
                    const next = new Map(state.cache);
                    next.set(email, { icon: undefined, fetched: true });
                    return { cache: next };
                });
            } finally {
                set((state) => {
                    const next = new Map(state.inflight);
                    next.delete(email);
                    return { inflight: next };
                });
            }
        })();

        set((state) => {
            const next = new Map(state.inflight);
            next.set(email, task);
            return { inflight: next };
        });

        return task;
    },

    icon(email: string) {
        return get().cache.get(email)?.icon;
    },
}));

