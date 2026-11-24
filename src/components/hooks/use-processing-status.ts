"use client";

import { useEffect, useState } from "react";
import { api } from "@/api";

export type ProcessingStatus = { waiting: number; processing: number; failed: number };

// null until the first answer; menuOpen is a dep only to read again, as the counts move within minutes.
export function useProcessingStatus(enabled: boolean, menuOpen: boolean) {
    const [status, setStatus] = useState<ProcessingStatus | null>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }
        let cancelled = false;

        void (async () => {
            const res = await api.admin["processing-status"].$get();
            if (!cancelled && res.status === 200) {
                setStatus(await res.json());
            }
        })().catch(() => {});

        return () => { cancelled = true; };
    }, [enabled, menuOpen]);

    return status;
}
