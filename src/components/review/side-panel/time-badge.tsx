import { formatTime } from "@/lib/utils";

export function TimeBadge({ seconds, muted }: { seconds: number; muted?: boolean }) {
    const tone = muted ? "bg-secondary text-secondary-foreground" : "bg-warning/40 text-warning";
    return <span className={`text-xs rounded px-1 ${tone}`}>{formatTime(seconds)}</span>;
}
