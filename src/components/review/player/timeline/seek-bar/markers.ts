import type { VideoComment } from "@/lib/db-types";

type MarkerComment = Pick<VideoComment, "id" | "userName" | "comment" | "time" | "videoRevNum">;

export type MarkerSource = {
    comments: MarkerComment[];
    className: string;
    // For a className that colours by revision.
    latestRevision?: number;
    // Under the bar, so two sources' markers at one time both show.
    below?: boolean;
    // Small and without a count.
    compact?: boolean;
};

// fraction is where time falls along the bar, 0 to 1; comments is never empty and has the newest revision first.
export type SeekBarMarker = { time: number; fraction: number; comments: MarkerComment[] };

// Wide enough for a two-digit count; a compact marker shows none.
export const markerWidth = (source: MarkerSource) => (source.compact ? 12 : 22);

// A source's comments whose markers would overlap on a seek bar of this width share one marker, at the earliest one's time.
export const sourceMarkers = (source: MarkerSource, duration: number, width: number): SeekBarMarker[] => {
    // A longer revision's comment can be past this video's end; it stands at the end of the bar.
    const fraction = (time: number) => Math.min(time, duration) / duration;
    const offset = (time: number) => fraction(time) * width;
    const markers: SeekBarMarker[] = [];

    // Offsets mean nothing until the bar is measured and the video's duration is known.
    if (width === 0 || duration === 0) {
        return markers;
    }

    for (const comment of [...source.comments].sort((a, b) => a.time - b.time)) {
        const marker = markers.at(-1);

        if (marker && offset(comment.time) - offset(marker.time) < markerWidth(source)) {
            marker.comments.push(comment);
        } else {
            markers.push({ time: comment.time, fraction: fraction(comment.time), comments: [comment] });
        }
    }

    // The newest revision leads, so it colours the marker.
    for (const marker of markers) {
        marker.comments.sort((a, b) => b.videoRevNum - a.videoRevNum);
    }

    return markers;
};
