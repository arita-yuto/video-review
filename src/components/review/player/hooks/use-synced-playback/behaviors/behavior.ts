import type { ReceivedSyncState, usePlaybackStoreApi } from "@/components/review/stores/playback-store";
import { useVideoStore } from "@/components/stores/video-store";

// While playing, closer than this counts as the same position, for a sent seek and a received one alike.
export const PLAYING_DRIFT_SEC = 0.5;
// Paused review needs the exact frame.
export const PAUSED_DRIFT_SEC = 0.001;
// Beyond this a screen jumps to the session; closer, it plays on.
export const FAR_DRIFT_SEC = 2;

/** Everything the behaviors share for one sync session on one player. */
export interface SyncContext {
    video: HTMLVideoElement;
    videoId: string;
    store: ReturnType<typeof usePlaybackStoreApi>;
}

export interface SyncBehavior {
    attach(): void;
    detach(): void;
}

// Where the session is now; a session that played past the end has stopped there.
export function expectedPosition(state: ReceivedSyncState, duration: number): { time: number; playing: boolean } {
    if (!state.playing) {
        return { time: Math.min(state.time, duration), playing: false };
    }

    const time = state.time + ((performance.now() - state.anchor) / 1000) * state.rate;
    if (time >= duration) {
        return { time: duration, playing: false };
    }
    return { time, playing: true };
}

export function isOwn(ctx: SyncContext, state: ReceivedSyncState): boolean {
    return state.by === ctx.store.getState().screenId;
}

// loadedmetadata too: a state received before the new source loaded is applied once it has.
export function watchSession(ctx: SyncContext, onSessionState: () => void): () => void {
    const { video, store } = ctx;
    onSessionState();
    video.addEventListener("loadedmetadata", onSessionState);
    const unsubscribe = store.subscribe((s, prev) => {
        if (s.syncState !== prev.syncState) {
            onSessionState();
        }
    });

    return () => {
        unsubscribe();
        video.removeEventListener("loadedmetadata", onSessionState);
    };
}

// Someone else's state on the shown revision, once the player knows the duration.
export function othersState(ctx: SyncContext): ReceivedSyncState | null {
    const state = ctx.store.getState().syncState;
    if (!state || isOwn(ctx, state)) {
        return null;
    }
    if (useVideoStore.getState().selectedRevision?.id !== state.revisionId) {
        return null;
    }
    if (ctx.video.readyState < HTMLMediaElement.HAVE_METADATA) {
        return null;
    }
    return state;
}
