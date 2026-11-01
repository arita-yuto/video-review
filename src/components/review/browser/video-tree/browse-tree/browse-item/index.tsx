import { useEffect, useRef, type ReactNode } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { VideoDetailHoverCard } from "@/components/review/browser/thumbnail-cell/detail-card";
import { VideoItemButton } from "@/components/review/browser/video-tree/nodes/item/video-item";
import { VideoSummary } from "@/components/review/browser/video-tree/browse-tree/browse-item/video-summary";

type Props = {
    video: VideoWithRevision;
    selected: boolean;
    marks: ReactNode;
    onSelect: (videoId: string) => void;
};

export function BrowseItem({ video, selected, marks, onSelect }: Props) {
    const ref = useRef<HTMLButtonElement>(null);
    const select = () => onSelect(video.id);

    // Also runs on mount, so opening the folder that holds the open video scrolls to it.
    useEffect(() => {
        if (selected) {
            ref.current?.scrollIntoView({ block: "nearest" });
        }
    }, [selected]);

    return (
        <SidebarMenuItem>
            <VideoDetailHoverCard video={video} onSelect={select}>
                <VideoItemButton
                    ref={ref}
                    video={video}
                    isActive={selected}
                    aria-current={selected || undefined}
                    onClick={select}
                    // HoverCardTrigger preventDefaults touchstart, which cancels the synthesized click.
                    onPointerUp={(e) => {
                        if (e.pointerType === "touch") {
                            select();
                        }
                    }}
                    // A clicked item keeps focus; opening the card on focus would leave it covering the player after switching windows or tabbing down the list.
                    onFocus={(e) => e.preventDefault()}
                    // Clears the stacked sticky headers when scrolled into view.
                    // The folder's FolderSection sets the margin; top-level items have no headers above them.
                    className="scroll-mt-(--item-scroll-margin)"
                >
                    <VideoSummary video={video} />

                    {marks}
                </VideoItemButton>
            </VideoDetailHoverCard>
        </SidebarMenuItem>
    );
}
