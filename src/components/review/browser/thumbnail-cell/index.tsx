import { forwardRef, type ReactNode } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { cn } from "@/lib/utils";
import { VideoDetailHoverCard } from "@/components/review/browser/thumbnail-cell/detail-card";

type Props = {
    video: VideoWithRevision;
    selectedVideoId: string | undefined;
    marks: ReactNode;
    children?: React.ReactNode;
    onSelectVideo?: (videoId: string) => void;
};

/** Picture-only grid cell; hovering it opens the detail card beside it. */
export const ThumbnailCell = forwardRef<HTMLDivElement, Props>(
    function ThumbnailCell({ video, selectedVideoId, marks, onSelectVideo, children }, ref) {
        const isSelected = video.id === selectedVideoId;
        const select = () => onSelectVideo?.(video.id);

        return (
            <VideoDetailHoverCard video={video} onSelect={select}>
                <div
                    ref={ref}
                    data-slot="thumbnail-card"
                    role="button"
                    tabIndex={0}
                    aria-label={video.title}
                    className={cn(
                        "relative thumb-frame ring-1 cursor-pointer transition-shadow",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground",
                        isSelected ? "ring-2 ring-primary" : "ring-accent hover:ring-muted-foreground"
                    )}
                    onClick={select}
                    // HoverCardTrigger preventDefaults touchstart, which cancels the synthesized click.
                    onPointerUp={(e) => {
                        if (e.pointerType === "touch") {
                            select();
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") {
                            return;
                        }
                        e.preventDefault();
                        select();
                    }}
                >
                    <div className="absolute top-1 left-1 z-10">{marks}</div>
                    {children}
                </div>
            </VideoDetailHoverCard>
        );
    }
);
