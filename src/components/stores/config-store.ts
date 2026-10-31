"use client";
import { create } from "zustand";
import { api } from "@/lib/api-client";
import type { LoginType } from "@/lib/auth-types";

// The General settings the screens need, each fetched from its own route at runtime, so a
// value saved on the admin screen applies on the next page load without a rebuild.
interface ConfigState {
    // Read before login. null until the answer is in, so the login screen doesn't guess.
    loginMethods: LoginType[] | null;
    loginDefaultType: LoginType | null;
    // Read once logged in.
    urlSchema: string | null;
    resolutionPresets: number[];

    loadLoginOptions: () => Promise<void>;
    loadConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>()((set) => ({
    loginMethods: null,
    loginDefaultType: null,
    urlSchema: null,
    resolutionPresets: [],

    loadLoginOptions: async () => {
        // The server enforces the guest flag itself, so when the answer can't be read the
        // screen falls back to the pre-configuration defaults rather than staying blank.
        const [guest, type, oauth] = await Promise.all([
            api.auth["guest-enabled"].$get().then(res => res.status === 200 ? res.json() : null).catch(() => null),
            api.auth["login-default-type"].$get().then(res => res.status === 200 ? res.json() : null).catch(() => null),
            api.auth.oauth.$get().then(res => res.status === 200 ? res.json() : null).catch(() => null),
        ]);
        const guestEnabled = guest?.enabled ?? false;
        const methods: LoginType[] = guestEnabled ? ["guest", "jira", "password"] : ["jira", "password"];
        if (oauth?.providers.includes("oidc")) {
            methods.push("oidc");
        }
        set({ loginMethods: methods, loginDefaultType: type?.type ?? "guest" });
    },

    loadConfig: async () => {
        const [schema, presets] = await Promise.all([
            api.config["url-schema"].$get().then(res => res.status === 200 ? res.json() : null).catch(() => null),
            api.config["resolution-presets"].$get().then(res => res.status === 200 ? res.json() : null).catch(() => null),
        ]);
        set({ urlSchema: schema?.urlSchema ?? null, resolutionPresets: presets?.presets ?? [] });
    },
}));
