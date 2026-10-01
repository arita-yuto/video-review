import { useState } from "react";
import { useFormatter } from "next-intl";
import { CalendarDays, Clock, Folder, Layers, Tag } from "lucide-react";
import { VideoWithRevision } from "@/lib/db-types";
import { formatTime } from "@/lib/utils";
import { PreviewVideo } from "@/components/video-browser/thumbnail-cell/preview-video";

const MAX_TAGS = 6;

type Props = {
    video: VideoWithRevision;
    thumbnailUrl: string | undefined;
};

/** Contents of the hover card: preview on the left, facts on the right. */
export function ThumbnailDetailCard({ video, thumbnailUrl }: Props) {
    const latest = video.latestRevision;
    const format = useFormatter();
    const [duration, setDuration] = useState<number>();
    // metadata.ts splits tags on ",", so a cleared tag list is [""].
    const allTags = latest?.tags?.filter(Boolean) ?? [];
    const tags = allTags.slice(0, MAX_TAGS);
    const hiddenTagCount = allTags.length - tags.length;

    return (
        <>
            <div className="w-64 shrink-0 bg-background rounded overflow-hidden aspect-video">
                <PreviewVideo filePath={latest?.filePath} posterUrl={thumbnailUrl} onDuration={setDuration} />
            </div>

            <div className="min-w-0 flex-1 flex flex-col gap-1.5 text-xs text-foreground/80">
                <div className="text-sm font-medium text-foreground leading-snug line-clamp-2 break-all">
                    {video.title}
                </div>

                {latest && (
                    <div className="flex items-center gap-1.5">
                        <Layers className="size-3.5 shrink-0" />
                        <span>v{latest.revision}</span>
                    </div>
                )}

                {latest && (
                    <div className="flex items-center gap-1.5 min-w-0">
                        <CalendarDays className="size-3.5 shrink-0" />
                        <span className="truncate">
                            {format.dateTime(new Date(latest.uploadedAt), { dateStyle: "medium", timeStyle: "short" })}
                            <span className="text-muted-foreground">
                                {" · "}
                                {format.relativeTime(new Date(latest.uploadedAt), new Date())}
                            </span>
                        </span>
                    </div>
                )}

                {duration !== undefined && Number.isFinite(duration) && (
                    <div data-slot="thumbnail-duration" className="flex items-center gap-1.5">
                        <Clock className="size-3.5 shrink-0" />
                        <span>{formatTime(duration)}</span>
                    </div>
                )}

                <div className="flex items-center gap-1.5 min-w-0">
                    <Folder className="size-3.5 shrink-0" />
                    <span className="truncate">{video.folderKey}</span>
                </div>

                {tags.length > 0 && (
                    <div className="flex items-start gap-1.5">
                        <Tag className="size-3.5 shrink-0 mt-0.5" />
                        <div className="flex flex-wrap gap-1 min-w-0">
                            {tags.map(tag => (
                                <span
                                    key={tag}
                                    className="max-w-full text-2xs px-1 py-px bg-secondary text-secondary-foreground rounded truncate"
                                >
                                    {tag}
                                </span>
                            ))}
                            {hiddenTagCount > 0 && (
                                <span className="text-2xs px-1 py-px text-muted-foreground">+{hiddenTagCount}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
