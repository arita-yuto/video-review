"use client";

import { useEffect, useState } from "react";
import { api } from "@/api";

export type LatestRelease = { version: string; url: string; notes: string };

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
                setLatest((await res.json()).latest);
            }
        })().catch(() => {});

        return () => { cancelled = true; };
    }, [enabled]);

    return latest;
}
