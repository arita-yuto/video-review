import type { VideoComment } from "@/lib/db-types";

export const MARKER_DOT_SIZE = 10;

type MarkerComment = Pick<VideoComment, "id" | "userName" | "comment" | "time" | "videoRevNum">;

export type SeekBarMarker = { time: number; className: string; revision: number; comments: MarkerComment[] };

// Comments of one revision within 0.01s share one marker, which carries the first comment's exact time so a click lands on it.
export const commentMarkers = (comments: MarkerComment[], className: string): SeekBarMarker[] => {
    const markers = new Map<string, SeekBarMarker>();

    for (const comment of comments) {
        const key = `${comment.videoRevNum}-${comment.time.toFixed(2)}`;
        const marker = markers.get(key);

        if (marker) {
            marker.comments.push(comment);
        } else {
            markers.set(key, { time: comment.time, className, revision: comment.videoRevNum, comments: [comment] });
        }
    }

    return [...markers.values()];
};

// Markers too close to stand apart on a bar of this width form one stack, newest revision last.
export const markerStacks = (markers: SeekBarMarker[], duration: number, width: number): SeekBarMarker[][] => {
    // A stack shows a count above its dot, which is about two dots wide.
    const STACK_WIDTH = MARKER_DOT_SIZE * 2;
    const left = (marker: SeekBarMarker) => (marker.time / duration) * width;
    const stacks: SeekBarMarker[][] = [];

    for (const marker of markers.toSorted((a, b) => a.time - b.time)) {
        const stack = stacks.at(-1);

        if (stack && left(marker) - left(stack[0]) < STACK_WIDTH) {
            stack.push(marker);
        } else {
            stacks.push([marker]);
        }
    }

    return stacks.map((stack) => stack.toSorted((a, b) => a.revision - b.revision));
};
