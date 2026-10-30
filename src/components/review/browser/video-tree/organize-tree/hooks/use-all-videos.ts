import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { VideoWithRevision } from "@/lib/db-types";

// Every video, unfiltered, kept apart so the browsing list's filtered videos survive the mode.
export function useAllVideos() {
    const [videos, setVideos] = useState<VideoWithRevision[]>([]);

    const reload = useCallback(async () => {
        const res = await api.videos.index.$get({ query: {} });
        if (res.status !== 200) {
            throw new Error("Failed to fetch videos");
        }
        setVideos(await res.json());
    }, []);

    useEffect(() => {
        reload().catch((reason) => console.error(reason));
    }, [reload]);

    return { videos, reload };
}
