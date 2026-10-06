import { forwardRef } from "react";
import { useFormatter } from "next-intl";
import { VideoWithRevision } from "@/lib/db-types";
import { cn } from "@/lib/utils";
import { NewBadge } from "@/components/video-browser/new-badge";
import { ThumbnailLazyLoader } from "@/components/video-browser/thumbnail-cell/lazy-loader";
import { splitTitle } from "@/components/video-browser/sections/utils";
import { useThumbnailGridStore } from "@/stores/thumbnail-grid-store";

type Props = {
    video: VideoWithRevision;
    selected: boolean;
    unread: boolean;
    containerRef: React.RefObject<HTMLDivElement | null>;
    onSelect: (videoId: string) => void;
};

export const VideoRow = forwardRef<HTMLDivElement, Props>(
    function VideoRow({ video, selected, unread, containerRef, onSelect }, ref) {
        const format = useFormatter();
        const urls = useThumbnailGridStore((s) => s.urls);
        const cacheUrl = useThumbnailGridStore((s) => s.cacheUrl);
        const latest = video.latestRevision;
        const { head, tail } = splitTitle(video.title);
        const select = () => onSelect(video.id);

        return (
            <div
                ref={ref}
                role="button"
                tabIndex={0}
                data-slot="video-row"
                aria-current={selected || undefined}
                title={video.title}
                onClick={select}
                onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    select();
                }}
                className={cn(
                    // Clears the sticky section header when scrolled into view.
                    "flex scroll-mt-8 items-center gap-2 py-1 pl-1.5 pr-2 border-l-2 cursor-pointer select-none",
                    "focus-visible:outline-none focus-visible:bg-accent",
                    selected ? "bg-sidebar-accent border-primary" : "border-transparent hover:bg-accent",
                )}
            >
                <div className="relative w-14 shrink-0 overflow-hidden rounded-sm">
                    <ThumbnailLazyLoader video={video} containerRef={containerRef} cache={urls} onResolve={cacheUrl} />
                    {unread && <NewBadge className="absolute top-0.5 left-0.5" />}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 whitespace-nowrap text-sm font-medium">
                        <span className="min-w-0 truncate">{head}</span>
                        <span className="shrink-0">{tail}</span>
                    </div>

                    {latest && (
                        <div className="flex gap-1.5 text-xs tabular-nums text-muted-foreground">
                            <span className="font-mono">v{latest.revision}</span>
                            <span>{format.relativeTime(new Date(latest.uploadedAt), new Date())}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
);
