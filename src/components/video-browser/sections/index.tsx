"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { SectionHeader } from "@/components/video-browser/sections/section-header";
import { VideoRow } from "@/components/video-browser/sections/video-row";
import { groupByFolder } from "@/components/video-browser/sections/utils";

const OPEN_SECTIONS_KEY = "videoSectionsOpen";

function loadOpenSections(): Set<string> {
    try {
        return new Set(JSON.parse(localStorage.getItem(OPEN_SECTIONS_KEY) ?? "[]"));
    } catch {
        return new Set();
    }
}

type Props = {
    videos: VideoWithRevision[];
    unReadVideoIds: string[];
    selectedVideoId: string | null;
    expandAll: boolean;
    onSelectVideo: (videoId: string) => void;
};

export default function VideoSections({ videos, unReadVideoIds, selectedVideoId, expandAll, onSelectVideo }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rowRefs = useRef(new Map<string, HTMLDivElement>());
    const [openSections, setOpenSections] = useState(loadOpenSections);
    // Closing a section during a filter is not remembered past that filter.
    const [closedWhileFiltering, setClosedWhileFiltering] = useState<Set<string>>(new Set());

    const sections = useMemo(() => groupByFolder(videos), [videos]);
    const unread = useMemo(() => new Set(unReadVideoIds), [unReadVideoIds]);

    useEffect(() => {
        try {
            localStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify([...openSections]));
        } catch {
            // Storage can be unavailable; the open state then lasts for this page only.
        }
    }, [openSections]);

    // A video opened from elsewhere (URL, auto-play next, upload) reveals its section.
    useEffect(() => {
        const video = videos.find((v) => v.id === selectedVideoId);
        if (!video) return;

        setOpenSections((prev) => prev.has(video.folderKey) ? prev : new Set(prev).add(video.folderKey));
        requestAnimationFrame(() => {
            rowRefs.current.get(video.id)?.scrollIntoView({ block: "nearest" });
        });
    }, [selectedVideoId, videos]);

    useEffect(() => {
        setClosedWhileFiltering(new Set());
    }, [expandAll]);

    const toggleIn = (set: Set<string>, folderKey: string) => {
        const next = new Set(set);
        if (!next.delete(folderKey)) next.add(folderKey);
        return next;
    };

    const isOpen = (folderKey: string) =>
        expandAll ? !closedWhileFiltering.has(folderKey) : openSections.has(folderKey);

    const toggle = (folderKey: string) => {
        if (expandAll) {
            setClosedWhileFiltering((prev) => toggleIn(prev, folderKey));
        } else {
            setOpenSections((prev) => toggleIn(prev, folderKey));
        }
    };

    return (
        <div ref={containerRef} data-slot="video-sections" className="min-h-0 flex-1 overflow-y-auto">
            {sections.map((section) => {
                const open = isOpen(section.folderKey);

                return (
                    <section key={section.folderKey}>
                        <SectionHeader
                            folderKey={section.folderKey}
                            open={open}
                            total={section.videos.length}
                            unread={section.videos.filter((v) => unread.has(v.id)).length}
                            onToggle={() => toggle(section.folderKey)}
                        />

                        {open && section.videos.map((video) => (
                            <VideoRow
                                key={video.id}
                                ref={(el) => {
                                    if (el) {
                                        rowRefs.current.set(video.id, el);
                                    } else {
                                        rowRefs.current.delete(video.id);
                                    }
                                }}
                                video={video}
                                selected={video.id === selectedVideoId}
                                unread={unread.has(video.id)}
                                containerRef={containerRef}
                                onSelect={onSelectVideo}
                            />
                        ))}
                    </section>
                );
            })}
        </div>
    );
}
