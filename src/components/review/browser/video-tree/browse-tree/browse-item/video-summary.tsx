import { useFormatter } from "next-intl";
import { VideoWithRevision } from "@/lib/db-types";
import { MiddleTruncate } from "@/components/controls/middle-truncate";

// What an item needs to tell videos apart.
export function VideoSummary({ video }: { video: VideoWithRevision }) {
    const format = useFormatter();
    const latest = video.latestRevision;

    return (
        <div className="min-w-0 flex-1">
            <div className="text-base font-medium">
                <MiddleTruncate text={video.title} />
            </div>

            {latest && (
                <div className="flex gap-1.5 text-supporting">
                    <span className="font-mono">v{latest.revision}</span>
                    <span>{format.relativeTime(new Date(latest.uploadedAt), new Date())}</span>
                </div>
            )}
        </div>
    );
}
