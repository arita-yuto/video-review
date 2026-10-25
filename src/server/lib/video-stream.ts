import "server-only";

// What the last person to act was doing; time is where they were when they sent it.
export interface SyncState {
    revisionId: string;
    playing: boolean;
    time: number;
    rate: number;
    // The sending screen, so it can tell its own echo from someone else's action.
    by: string;
}

// Who a syncing screen shows up as to the others.
export interface Participant {
    name: string;
    // Looks up the avatar; null for guests and the API token.
    email: string | null;
}

// The one open stream behind a subscriber, as the route hands it over.
export interface StreamConnection {
    send: (event: string, data: unknown) => void;
    keepAlive: () => void;
    close: () => void;
}

interface Subscriber {
    connectionId: string;
    // Null while the screen only watches the count.
    participant: Participant | null;
    connection: StreamConnection;
    // Server clock of the last ping; a successful write proves nothing behind a proxy that keeps the socket open.
    lastSeen: number;
}

interface Channel {
    subscribers: Set<Subscriber>;
    state: SyncState | null;
    // Server clock when state arrived; receivers get its age, so their clocks never need to agree.
    stateAt: number;
    // While set, only this connection may change the state.
    presenter: Subscriber | null;
    // A participant requesting the presenter to hand over; takes over when the presenter stops or leaves.
    requester: Subscriber | null;
}

// The browser pings every 20s; a hidden tab's timers can be held back to once a minute.
const STALE_AFTER_MS = 90_000;
// Also the keepalive interval, under the common 60s idle timeout of proxies in front of the app.
const PATROL_MS = 25_000;

// Kept on globalThis so a dev hot reload of this module still sees the open connections.
const globalForStream = globalThis as unknown as {
    videoStreamChannels?: Map<string, Channel>;
    videoStreamPatrol?: ReturnType<typeof setInterval>;
};

const channels = globalForStream.videoStreamChannels ?? new Map<string, Channel>();
globalForStream.videoStreamChannels = channels;

function broadcastSync(channel: Channel) {
    const participants = [...channel.subscribers].flatMap((s) => s.participant === null ? [] : [s.participant]);
    const state = channel.state && { ...channel.state, ageMs: Date.now() - channel.stateAt };
    const presenter = channel.presenter?.participant ?? null;
    const requester = channel.requester?.participant ?? null;

    for (const s of channel.subscribers) {
        s.connection.send("sync", {
            participants,
            state,
            presenter,
            presenting: s === channel.presenter,
            requester,
            requesting: s === channel.requester,
        });
    }
}

// Tells every open screen of the video to fetch its comments again.
export function broadcastComments(videoId: string) {
    const channel = channels.get(videoId);
    if (!channel) {
        return;
    }

    for (const s of channel.subscribers) {
        s.connection.send("comments", {});
    }
}

// Whether others remain to be told; false when already gone, as the close and the patrol can both get here.
function removeSubscriber(videoId: string, channel: Channel, subscriber: Subscriber): boolean {
    if (!channel.subscribers.delete(subscriber)) {
        return false;
    }

    if (channel.requester === subscriber) {
        channel.requester = null;
    }

    // A presenter who left hands over to the requester, or back to everyone.
    if (channel.presenter === subscriber) {
        channel.presenter = channel.requester;
        channel.requester = null;
    }

    // The session ends with its last participant, so the next one starts from whoever acts first.
    if (![...channel.subscribers].some((s) => s.participant !== null)) {
        channel.state = null;
    }

    // The first removal always finds its channel still registered, so this cannot drop a newer one.
    if (channel.subscribers.size === 0) {
        channels.delete(videoId);
        return false;
    }
    return true;
}

// The only place that decides a subscriber is gone, other than the browser closing the stream itself.
function patrol() {
    const now = Date.now();

    for (const [videoId, channel] of [...channels]) {
        // Everyone dropped in one round is announced together.
        let othersRemain = false;
        for (const s of [...channel.subscribers]) {
            if (now - s.lastSeen > STALE_AFTER_MS) {
                othersRemain = removeSubscriber(videoId, channel, s);
                s.connection.close();
            } else {
                s.connection.keepAlive();
            }
        }

        if (othersRemain) {
            broadcastSync(channel);
        }
    }

    if (channels.size === 0) {
        clearInterval(globalForStream.videoStreamPatrol);
        globalForStream.videoStreamPatrol = undefined;
    }
}

function startPatrol() {
    if (globalForStream.videoStreamPatrol === undefined) {
        // Never what keeps a process from exiting.
        globalForStream.videoStreamPatrol = setInterval(patrol, PATROL_MS);
        globalForStream.videoStreamPatrol.unref?.();
    }
}

// A dev hot reload replaces patrol(); the timer must run the new one.
if (globalForStream.videoStreamPatrol !== undefined) {
    clearInterval(globalForStream.videoStreamPatrol);
    globalForStream.videoStreamPatrol = undefined;
    startPatrol();
}

function createChannel(videoId: string): Channel {
    const channel: Channel = { subscribers: new Set(), state: null, stateAt: 0, presenter: null, requester: null };
    channels.set(videoId, channel);
    return channel;
}

// Returns the unsubscribe for the browser closing the stream.
export function subscribeVideoStream(videoId: string, connectionId: string, participant: Participant | null, connection: StreamConnection): () => void {
    const channel = channels.get(videoId) ?? createChannel(videoId);
    const self: Subscriber = { connectionId, participant, connection, lastSeen: Date.now() };
    channel.subscribers.add(self);
    broadcastSync(channel);
    startPatrol();

    return () => {
        if (removeSubscriber(videoId, channel, self)) {
            broadcastSync(channel);
        }
    };
}

function findSubscriber(videoId: string, connectionId: string): { channel: Channel; subscriber: Subscriber } | null {
    const channel = channels.get(videoId);
    const subscriber = channel && [...channel.subscribers].find((s) => s.connectionId === connectionId);
    return channel && subscriber ? { channel, subscriber } : null;
}

// Returns false when the server no longer has the connection.
export function touchVideoStream(videoId: string, connectionId: string): boolean {
    const found = findSubscriber(videoId, connectionId);
    if (!found) {
        return false;
    }

    found.subscriber.lastSeen = Date.now();
    return true;
}

// Returns false when the connection is not in the session or someone else is presenting.
export function updateSyncState(videoId: string, connectionId: string, state: SyncState): boolean {
    const found = findSubscriber(videoId, connectionId);
    if (!found || found.subscriber.participant === null) {
        return false;
    }

    const { channel, subscriber } = found;
    if (channel.presenter !== null && channel.presenter !== subscriber) {
        return false;
    }

    channel.state = state;
    channel.stateAt = Date.now();
    broadcastSync(channel);
    return true;
}

// Returns false when the connection is not in the session, or someone else is already requesting.
// A non-presenter's `true` requests a handover and `false` withdraws it; the presenter's `false` hands over, `true` declines.
export function updatePresenter(videoId: string, connectionId: string, presenting: boolean): boolean {
    const found = findSubscriber(videoId, connectionId);
    if (!found || found.subscriber.participant === null) {
        return false;
    }

    const { channel, subscriber } = found;
    if (channel.presenter === null || channel.presenter === subscriber) {
        channel.presenter = presenting ? subscriber : channel.requester;
        channel.requester = null;
    } else if (presenting) {
        if (channel.requester !== null && channel.requester !== subscriber) {
            return false;
        }
        channel.requester = subscriber;
    } else if (channel.requester === subscriber) {
        channel.requester = null;
    }

    broadcastSync(channel);
    return true;
}
