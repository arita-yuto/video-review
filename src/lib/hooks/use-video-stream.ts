"use client";
import { useEffect } from "react";
import { api } from "@/lib/api-client";
import { usePlaybackStoreApi, type Participant, type ReceivedSyncState } from "@/stores/playback-store";
import { useSyncing } from "@/lib/sync-session";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoStore } from "@/stores/video-store";

const PING_MS = 20_000;

interface SyncEvent {
    participants: Participant[];
    state: (Omit<ReceivedSyncState, "anchor"> & { ageMs: number }) | null;
    presenter: Participant | null;
    presenting: boolean;
    requester: Participant | null;
    requesting: boolean;
}

// One stream per review screen, open whether or not this screen syncs.
export function useVideoStream(videoId: string | null) {
    const store = usePlaybackStoreApi();
    const syncing = useSyncing(videoId);

    useEffect(() => {
        if (!videoId) {
            return;
        }

        // The server holds the sync flag per connection, so toggling it reconnects.
        const query = syncing ? "?sync=1" : "";
        const source = new EventSource(`/api/v1/videos/${encodeURIComponent(videoId)}/stream${query}`);

        // The server drops a connection that stops pinging, which is how it notices a closed tab behind a proxy.
        const fetchCommentsLive = () => {
            const revision = useVideoStore.getState().selectedRevision;
            if (revision?.videoId === videoId) {
                void useCommentStore.getState().fetchComments(revision, { live: true }).catch((e) => console.error("Failed to fetch comments", e));
            }
        };

        let pingTimer: ReturnType<typeof setInterval> | undefined;
        source.addEventListener("hello", (e) => {
            // Comments changed while the stream was down sent no signal here.
            fetchCommentsLive();

            const { connectionId } = JSON.parse(e.data) as { connectionId: string };
            store.getState().setConnectionId(connectionId);
            clearInterval(pingTimer);
            pingTimer = setInterval(() => {
                void api.videos[":id"].stream.ping.$post({ param: { id: videoId }, json: { connectionId } }).catch(() => {});
            }, PING_MS);
        });

        source.addEventListener("sync", (e) => {
            const { participants, state, presenter, presenting, requester, requesting } = JSON.parse(e.data) as SyncEvent;
            const { setParticipants, setPresenter, setRequester, setSyncState, syncState: current, screenId } = store.getState();
            setParticipants(participants);

            // This screen already holds its own state, anchored when the change happened here.
            if (state?.by !== screenId || current?.by !== screenId) {
                setSyncState(state && { ...state, anchor: performance.now() - state.ageMs });
            }

            // After the state, so a screen that starts presenting sends the one just received.
            // A screen outside the session plays on its own, whoever presents.
            setPresenter(syncing ? presenter : null, presenting);
            setRequester(syncing ? requester : null, requesting);
        });

        // Changes in a row are fetched once, but a stream of them that never pauses still shows within about a second.
        const COMMENTS_SETTLE_MS = 300;
        const COMMENTS_MAX_WAIT_MS = 1000;
        // Every screen gets the same signal at once; a random share of this keeps them from all fetching in the same moment.
        const COMMENTS_SPREAD_MS = 300;
        let commentsTimer: ReturnType<typeof setTimeout> | undefined;
        let fetchBy: number | null = null;
        let spread = 0;
        source.addEventListener("comments", () => {
            clearTimeout(commentsTimer);
            const now = performance.now();
            if (fetchBy === null) {
                spread = Math.random() * COMMENTS_SPREAD_MS;
                fetchBy = now + COMMENTS_MAX_WAIT_MS + spread;
            }
            const delay = Math.min(now + COMMENTS_SETTLE_MS + spread, fetchBy) - now;

            commentsTimer = setTimeout(() => {
                fetchBy = null;
                fetchCommentsLive();
            }, delay);
        });

        return () => {
            clearInterval(pingTimer);
            clearTimeout(commentsTimer);
            source.close();
            store.getState().setParticipants([]);
            store.getState().setSyncState(null);
            store.getState().setConnectionId(null);
            store.getState().setPresenter(null, false);
            store.getState().setRequester(null, false);
        };
    }, [videoId, syncing, store]);
}
