"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { createVideoSyncLink, JOIN_PARAM, SYNC_PARAM } from "@/lib/url";
import { usePlayback } from "@/stores/playback-store";

type Router = ReturnType<typeof useRouter>;

export interface PlayerState {
    revisionId: string;
    playing: boolean;
    time: number;
    rate: number;
}

// screenId tags the sender, so its own echo is not followed; connectionId lets the server check for a presenter.
export async function postSyncState(videoId: string, state: PlayerState, screenId: string, connectionId: string): Promise<boolean> {
    try {
        const res = await api.videos[":id"].sync.state.$post({ param: { id: videoId }, json: { ...state, by: screenId, connectionId } });
        return res.ok;
    } catch (e) {
        console.error("Failed to send the sync state", e);
        return false;
    }
}

export async function putPresenter(videoId: string, connectionId: string, presenting: boolean): Promise<void> {
    try {
        await api.videos[":id"].sync.presenter.$put({ param: { id: videoId }, json: { connectionId, presenting } });
    } catch (e) {
        console.error("Failed to change the presenter", e);
    }
}

// Someone else presents in this screen's sync session, so its playback controls are locked.
export function usePresenterLock(): boolean {
    return usePlayback((s) => s.presenter !== null && !s.presenting);
}

// Only the video the URL names; the player can move on to the next video without changing the URL.
export function useSyncing(videoId: string | null): boolean {
    const params = useParams();
    const searchParams = useSearchParams();

    return videoId !== null && params.videoId === videoId && searchParams.get(SYNC_PARAM) === "1";
}

// Opened from the shared link and not yet answered.
export function useJoining(videoId: string | null): boolean {
    const params = useParams();
    const searchParams = useSearchParams();

    return videoId !== null && params.videoId === videoId && searchParams.get(JOIN_PARAM) === "1";
}

function replaceSyncParam(syncing: boolean) {
    const url = new URL(window.location.href);
    url.searchParams.delete(JOIN_PARAM);
    if (syncing) {
        url.searchParams.set(SYNC_PARAM, "1");
    } else {
        url.searchParams.delete(SYNC_PARAM);
    }

    // Straight into history: a router navigation would remount the page and reload the video.
    window.history.replaceState(null, "", url);
}

export function joinSync(videoId: string, router: Router) {
    // After autoplay moved on, the URL still names the previous video; go to the shown one instead.
    const link = new URL(createVideoSyncLink(window.location.origin, videoId));
    if (window.location.pathname !== link.pathname) {
        router.replace(`${link.pathname}${link.search}`);
        return;
    }

    replaceSyncParam(true);
}

export function leaveSync() {
    replaceSyncParam(false);
}
