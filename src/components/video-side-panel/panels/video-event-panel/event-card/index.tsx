"use client";

import React, { useMemo } from "react";
import { usePlayback } from "@/stores/playback-store";
import TimelineCardList from "@/components/video-side-panel/timeline-card-list";
import EventCardHeader from "@/components/video-side-panel/panels/video-event-panel/event-card/header";
import EventCardContent from "@/components/video-side-panel/panels/video-event-panel/event-card/content";
import { VideoEventWithKind } from "@/lib/db-types";

export default function EventCard(props: {
    events: VideoEventWithKind[];
    selectedEventId: string | null;
    onSelectEvent: (event: VideoEventWithKind) => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
    eventCardRef: React.RefObject<Record<string, HTMLDivElement | null>>;
}) {
    const currentTime = usePlayback((s) => s.currentTime);

    const activeEventIds = useMemo(() => {
        const nowMs = currentTime * 1000;
        return new Set(
            props.events
                .filter((event) => event.startMs <= nowMs && nowMs <= event.endMs)
                .map((event) => event.id)
        );
    }, [currentTime, props.events]);

    return (
        <TimelineCardList
            items={props.events}
            containerRef={props.containerRef}
            itemCardRef={props.eventCardRef}
            getKey={(event) => event.id}
            getCardState={(event) => {
                if (props.selectedEventId === event.id) return "selected";
                if (activeEventIds.has(event.id)) return "active";
                if (event.links.length > 0) return "link";
                return "none";
            }}
            onClick={(event) => { props.onSelectEvent(event) }}
            renderHeader={(event) => <EventCardHeader event={event} />}
            renderContent={(event) => <EventCardContent event={event} />}
            renderFooter={() => null}
        />
    );
}
