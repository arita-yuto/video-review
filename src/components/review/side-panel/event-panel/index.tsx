"use client";

import { useTranslations } from "next-intl";
import { VideoEventSearchDialog } from "@/components/review/side-panel/event-panel/video-event-search";
import { SidebarGroup } from "@/ui/sidebar";
import { SidebarSearchInput } from "@/components/controls/sidebar-search-input";
import { PanelSearchActions } from "@/components/review/side-panel/panel-search-actions";
import VideoEventContent from "@/components/review/side-panel/event-panel/content";
import { useVideoEventSearchStore } from "@/components/review/side-panel/event-panel/stores/video-event-search-store";
import { useVideoEventStore } from "@/components/review/side-panel/event-panel/stores/video-event-store";
import { useVideoStore } from "@/components/stores/video-store";
import { VideoSidePanelDefinition } from "@/components/review/side-panel/types";

export function useVideoEventPanelDefinition(): VideoSidePanelDefinition {
    const tEvent = useTranslations("video-event-panel");
    const { selectedRevision } = useVideoStore();
    const { fetchEvents } = useVideoEventStore();
    const eventSearch = useVideoEventSearchStore();

    return {
        key: "events",
        label: tEvent("tab"),
        renderPanel: ({ topAreaRef }) => <VideoEventContent topAreaRef={topAreaRef} />,
        renderHeaderActions: ({ openDialog }) => (
            <PanelSearchActions
                filtering={eventSearch.isFiltering()}
                onOpen={openDialog}
                onClear={() => {
                    eventSearch.clear();
                    if (selectedRevision) {
                        fetchEvents(selectedRevision);
                    }
                }}
            />
        ),
        renderHeaderBody: () => (
            <SidebarGroup>
                <SidebarSearchInput value={eventSearch.filterText} onChange={eventSearch.setFilterText} placeholder="Filter event text..." />
            </SidebarGroup>
        ),
        renderDialog: ({ open, onClose }) => (
            <VideoEventSearchDialog open={open} onClose={onClose} />
        ),
    };
}
