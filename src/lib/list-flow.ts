// How a timeline list moves with playback: where it should be at a moment, and how it gets there.

// Where the list should sit when this item is the current one.
export type FlowAnchor = { time: number; top: number };

// The list position for this time, interpolated between the anchors on either side.
export function flowTarget(anchors: FlowAnchor[], time: number): number {
    const next = anchors.findIndex((anchor) => anchor.time > time);
    if (next === 0) {
        return anchors[0].top * (time / anchors[0].time);
    }
    if (next === -1) {
        return anchors[anchors.length - 1].top;
    }

    const current = anchors[next - 1];
    const progress = (time - current.time) / (anchors[next].time - current.time);
    return current.top + (anchors[next].top - current.top) * progress;
}

export type FollowState = { top: number; catchingUp: boolean };

// The list holds still until it is this far behind, then catches up.
export const FOLLOW_HOLD_PX = 40;
// Slower than this would creep a pixel at a time, which the eye reads as stutter.
export const FOLLOW_MIN_PX_PER_MS = 0.09;
// How far behind the exact position the list trails, so the speed changes smoothly from one item to the next.
const FOLLOW_TRAIL_MS = 400;

// One frame of the list following its target.
export function followStep(state: FollowState, target: number, elapsedMs: number): FollowState {
    const gap = target - state.top;
    if (!state.catchingUp && Math.abs(gap) < FOLLOW_HOLD_PX) {
        return state;
    }

    const trailing = Math.abs(gap) * (1 - Math.exp(-elapsedMs / FOLLOW_TRAIL_MS));
    const move = Math.min(Math.abs(gap), Math.max(trailing, FOLLOW_MIN_PX_PER_MS * elapsedMs));
    return { top: state.top + Math.sign(gap) * move, catchingUp: Math.abs(gap) > move };
}
