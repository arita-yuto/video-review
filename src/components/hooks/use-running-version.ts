"use client";

import { useEffect, useState } from "react";
import { api } from "@/api";

export async function fetchRunningVersion() {
    const res = await api.version.index.$get().catch(() => null);
    return res?.status === 200 ? (await res.json()).version : null;
}

// null until the server answers, or when it does not.
export function useRunningVersion() {
    const [version, setVersion] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        void fetchRunningVersion().then((answered) => {
            if (!cancelled) {
                setVersion(answered);
            }
        });

        return () => { cancelled = true; };
    }, []);

    return version;
}
