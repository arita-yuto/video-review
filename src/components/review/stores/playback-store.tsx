"use client"
import { createContext, ReactNode, useContext, useState } from "react";
import { createStore, StoreApi, useStore } from "zustand";

// The sync session's playback state as this screen received it.
export interface ReceivedSyncState {
    revisionId: string;
    playing: boolean;
    time: number;
    rate: number;
    by: string;
    // performance.now() at the moment the sender was at `time`; local clock only.
    anchor: number;
}

export interface Participant {
    name: string;
    email: string | null;
}

interface PlaybackState {
    isPlaying: boolean;
    currentTime: number;
    // Set while the seek bar is dragged or a jump is requested; the player seeks to it.
    timelineTime: number | null;
    // While the seek bar is held, so the sync session gets only where it is let go.
    scrubbing: boolean;
    duration: number;
    // The connections in this video's sync session, in join order, known whether or not this screen is in it.
    participants: Participant[];
    // The sync link the dialog shows, null while closed; kept here so it survives joining from another video's URL.
    syncLink: string | null;
    syncState: ReceivedSyncState | null;
    // Tags what this screen sends, so the echo of its own action is not followed.
    screenId: string;
    // This screen's stream, from `hello`; null until it opens.
    connectionId: string | null;
    // Who presents in the sync session; null while this screen is not syncing.
    presenter: Participant | null;
    presenting: boolean;
    // Who requests the presenter to hand over; null while nobody does or this screen is not syncing.
    requester: Participant | null;
    requesting: boolean;

    setIsPlaying: (playing: boolean) => void;
    togglePlay: () => void;
    setCurrentTime: (time: number) => void;
    setTimelineTime: (time: number | null) => void;
    setScrubbing: (scrubbing: boolean) => void;
    setDuration: (duration: number) => void;
    setParticipants: (participants: Participant[]) => void;
    setSyncLink: (link: string | null) => void;
    setSyncState: (state: ReceivedSyncState | null) => void;
    setConnectionId: (connectionId: string | null) => void;
    setPresenter: (presenter: Participant | null, presenting: boolean) => void;
    setRequester: (requester: Participant | null, requesting: boolean) => void;
}

const createPlaybackStore = () => createStore<PlaybackState>()((set) => ({
    isPlaying: false,
    currentTime: 0,
    timelineTime: null,
    scrubbing: false,
    duration: 0,
    participants: [],
    syncLink: null,
    syncState: null,
    // Not crypto.randomUUID: on-premise http is not a secure context.
    screenId: Math.random().toString(36).slice(2),
    connectionId: null,
    presenter: null,
    presenting: false,
    requester: null,
    requesting: false,

    setIsPlaying: (playing) => set({ isPlaying: playing }),
    togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
    setCurrentTime: (time) => set({ currentTime: time }),
    setTimelineTime: (time) => set({ timelineTime: time }),
    setScrubbing: (scrubbing) => set({ scrubbing }),
    setDuration: (duration) => set({ duration }),
    setParticipants: (participants) => set({ participants }),
    setSyncLink: (syncLink) => set({ syncLink }),
    setSyncState: (syncState) => set({ syncState }),
    setConnectionId: (connectionId) => set({ connectionId }),
    setPresenter: (presenter, presenting) => set({ presenter, presenting }),
    setRequester: (requester, requesting) => set({ requester, requesting }),
}));

const PlaybackStoreContext = createContext<StoreApi<PlaybackState> | null>(null);

// Each screen gets its own playback state, so the review page and the diff-view never
// see each other's position or play state.
export function PlaybackStoreProvider({ children }: { children: ReactNode }) {
    const [store] = useState(createPlaybackStore);

    return <PlaybackStoreContext.Provider value={store}>{children}</PlaybackStoreContext.Provider>;
}

export function usePlaybackStoreApi() {
    const store = useContext(PlaybackStoreContext);
    if (!store) throw new Error("usePlaybackStoreApi must be used inside PlaybackStoreProvider");
    return store;
}

export const usePlayback = <T,>(selector: (s: PlaybackState) => T) => useStore(usePlaybackStoreApi(), selector);
