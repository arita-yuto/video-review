"use client";

import { useEffect, useMemo, useRef } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { Slider } from "@/ui/slider";
import { ZoomInIcon } from "lucide-react";
import { ThumbnailCell } from "@/components/review/browser/thumbnail-cell";
import { ThumbnailLazyLoader } from "@/components/review/browser/thumbnail-cell/lazy-loader";
import { useThumbnailGridStore } from "@/components/review/browser/stores/thumbnail-grid-store";
import { Marks } from "@/components/review/browser/marks/marks";
import type { MarkContext } from "@/components/review/browser/marks/use-mark-context";

type Props = {
    videos: VideoWithRevision[];
    markContext: MarkContext;
    selectedVideoId: string | undefined;
    onSelectVideo?: (videoId: string) => void;
};

export default function VideoThumbnails({ videos, markContext, selectedVideoId, onSelectVideo }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const thumbSize = useThumbnailGridStore((s) => s.thumbSize);
    const setThumbSize = useThumbnailGridStore((s) => s.setThumbSize);

    // One section per folder, in the order the sidebar shows them.
    const groups = useMemo(() => {
        const byFolder = new Map<string, VideoWithRevision[]>();
        for (const video of videos) {
            let group = byFolder.get(video.folderKey);
            if (!group) byFolder.set(video.folderKey, group = []);
            group.push(video);
        }
        return [...byFolder.entries()];
    }, [videos]);
    const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    useEffect(() => {
        if (!selectedVideoId) return;

        const el = itemRefs.current.get(selectedVideoId);
        if (!el) return;

        el.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }, [selectedVideoId]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full flex flex-col"
        >
            {/* Grid */}
            <div className="flex-1 overflow-auto px-3 pb-3">
                {groups.map(([folderKey, folderVideos]) => (
                    <section key={folderKey} data-slot="thumbnail-group" className="pt-3">
                        <h3
                            data-slot="thumbnail-group-title"
                            // Above the cells' marks (z-10) so they do not bleed through the pinned heading.
                            className="sticky top-0 z-20 flex items-baseline gap-2 py-1.5 mb-1.5 bg-sidebar border-b text-xs font-semibold text-primary"
                        >
                            <span className="truncate">{folderKey || "/"}</span>
                            <span className="text-trailing">{folderVideos.length}</span>
                            <Marks videos={folderVideos} scope="folder" context={markContext} />
                        </h3>
                        <div className="grid gap-1.5 thumbnail-grid" style={{ "--thumb-size": `${thumbSize}px` } as React.CSSProperties}>
                            {folderVideos.map(video => (
                                <ThumbnailCell
                                    key={video.id}
                                    ref={el => {
                                        if (el) {
                                            itemRefs.current.set(video.id, el);
                                        } else {
                                            itemRefs.current.delete(video.id);
                                        }
                                    }}
                                    video={video}
                                    selectedVideoId={selectedVideoId}
                                    marks={<Marks videos={[video]} scope="video" context={markContext} />}
                                    onSelectVideo={onSelectVideo}
                                >
                                    <ThumbnailLazyLoader video={video} containerRef={containerRef} />
                                </ThumbnailCell>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {/* Slider */}
            <div className="flex items-center gap-3 px-3 py-3 border-t bg-background">
                <ZoomInIcon></ZoomInIcon>
                <Slider
                    min={60}
                    // Source thumbnails are 480px wide; past ~240 the cell only upscales.
                    max={240}
                    step={10}
                    value={[thumbSize]}
                    onValueChange={(v) => {
                        setThumbSize(v[0])
                    }}
                    onValueCommit={(v) => {
                        setThumbSize(v[0])
                    }}
                    className="w-full"
                />
            </div>
        </div>
    );
}
