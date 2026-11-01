export type DiffImageState =
    | { status: "waiting" }
    // The previous image stays on screen, dimmed, until the new one arrives.
    | { status: "computing", previous: ImageBitmap | null }
    | { status: "ready", image: ImageBitmap }
    // The media comes from another origin and the browser refuses to hand out its pixels.
    | { status: "unreadable" };

// What just happened; the reducer turns it into the next state.
export type DiffImageEvent =
    | { type: "started" }
    | { type: "received", image: ImageBitmap }
    | { type: "refused" }
    // No result is coming: playback started, or the capture or the diff failed.
    | { type: "cancelled" }
    | { type: "reset" };

export const initialDiffImageState: DiffImageState = { status: "waiting" };

export const diffImageReducer = (state: DiffImageState, event: DiffImageEvent): DiffImageState => {
    switch (event.type) {
        case "started":
            switch (state.status) {
                case "ready": return { status: "computing", previous: state.image };
                case "waiting": return { status: "computing", previous: null };
                // Keeps the image that was on screen before the first of several moves.
                case "computing": return state;
                // Media that can't be read stays so until a revision changes, which resets.
                case "unreadable": return state;
            }
        case "received":
            return { status: "ready", image: event.image };
        case "refused":
            return { status: "unreadable" };
        // The image kept while computing belongs to a position already left, so it isn't brought back.
        case "cancelled":
            return state.status === "computing" ? { status: "waiting" } : state;
        case "reset":
            return initialDiffImageState;
    }
};
