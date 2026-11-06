"use client";

import { useEffect, useState } from "react";
import { api } from "@/api";

// installable: this server is a zip install that the release dialog can update.
export type LatestRelease = { version: string; url: string; notes: string; installable: boolean };

// null when the check is off, fails, or this build is current.
export function useLatestRelease(enabled: boolean) {
    const [latest, setLatest] = useState<LatestRelease | null>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }
        let cancelled = false;

        void (async () => {
            const res = await api.admin["latest-release"].$get();
            if (!cancelled && res.status === 200) {
                const { latest, installable } = await res.json();
                setLatest(latest && { ...latest, installable });
            }
        })().catch(() => {});

        return () => { cancelled = true; };
    }, [enabled]);

    return latest;
}
