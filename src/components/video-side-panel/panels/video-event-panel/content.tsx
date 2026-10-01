"use client";

import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useVideoStore } from "@/stores/video-store";
import { useVideoEventStore } from "@/stores/video-event-store";
import { usePlayback } from "@/stores/playback-store";
import EventCard from "@/components/video-side-panel/panels/video-event-panel/event-card";
import { useVideoEventSearchStore } from "@/stores/video-event-search-store";

export default function VideoEventContent(props: {
    topAreaRef: RefObject<HTMLDivElement | null>,
}) {
    const t = useTranslations("video-event-panel");
    const containerRef = useRef<HTMLDivElement>(null);
    const eventCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    const { selectedRevision } = useVideoStore();
    const currentTime = usePlayback((s) => s.currentTime);
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const { events, fetchEvents, clearEvents } = useVideoEventStore();
    const { filterText, kind, hasLink } = useVideoEventSearchStore();

    useEffect(() => {
        if (!selectedRevision) {
            clearEvents();
            setSelectedEventId(null);
            return;
        }

        clearEvents();
        setSelectedEventId(null);
        void fetchEvents(selectedRevision);
    }, [selectedRevision, filterText, kind, hasLink]);

    useEffect(() => {
        if (!selectedEventId) return;
        if (!events.some((event) => event.id === selectedEventId)) {
            setSelectedEventId(null);
        }
    }, [events, selectedEventId]);

    const activeEvent = useMemo(() => {
        const nowMs = currentTime * 1000;
        return events.find((event) => event.startMs <= nowMs && nowMs <= event.endMs) ?? null;
    }, [currentTime, events]);

    useEffect(() => {
        if (!activeEvent || !props.topAreaRef.current || !containerRef.current) {
            return;
        }

        const el = eventCardRefs.current[activeEvent.id];
        if (!el) return;

        const headerHeight = props.topAreaRef.current.getBoundingClientRect().height + 5;
        containerRef.current.scrollTo({
            top: el.offsetTop - headerHeight,
            behavior: "smooth",
        });
    }, [activeEvent]);

    return (
        <div className="bg-sidebar w-full h-full flex flex-col border-r">
            {events.length > 0
                ? (
                    <EventCard
                        events={events}
                        selectedEventId={selectedEventId}
                        onSelectEvent={(event) => {
                            setSelectedEventId(event.id);
                            setTimelineTime(event.startMs / 1000);
                        }}
                        containerRef={containerRef}
                        eventCardRef={eventCardRefs}
                    />
                )
                : (
                    <div className="flex-1 p-4 text-sm text-muted-foreground">
                        {t("empty")}
                    </div>
                )}
        </div>
    );
}
