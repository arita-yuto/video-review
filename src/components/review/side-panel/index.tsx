"use client";

import { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent } from "@/ui/tabs";
import VideoSidePanelHeader from "@/components/review/side-panel/header";
import { useVideoCommentPanelDefinition } from "@/components/review/side-panel/comment-panel";
import { useVideoEventPanelDefinition } from "@/components/review/side-panel/event-panel";
import { useVcsChangesPanelDefinition } from "@/components/review/side-panel/vcs-panel";

export default function VideoSidePanel() {
    const commentPanel = useVideoCommentPanelDefinition();
    const eventPanel = useVideoEventPanelDefinition();
    const vcsChangesPanel = useVcsChangesPanelDefinition();
    // Add new tabs by appending another panel definition here.
    // The shell will automatically render its tab, body, and optional dialog slots.
    const panels = [commentPanel, eventPanel, vcsChangesPanel];
    const [tab, setTab] = useState("comments");
    const [searchDialogOpen, setSearchDialogOpen] = useState(false);
    const topAreaRef = useRef<HTMLDivElement>(null);
    const currentPanel = panels.find((panel) => panel.key === tab) ?? panels[0];

    useEffect(() => {
        setSearchDialogOpen(false);
    }, [tab]);

    return (
        <Tabs value={tab} onValueChange={setTab} className="h-full min-w-0 gap-0">
            <div ref={topAreaRef}>
                <VideoSidePanelHeader
                    panels={panels}
                    currentPanel={currentPanel}
                    openDialog={() => { setSearchDialogOpen(true) }}
                />
            </div>
            {panels.map((panel) => (
                <TabsContent key={panel.key} value={panel.key} className="min-h-0 min-w-0 mt-0 overflow-x-hidden">
                    {panel.renderPanel({ topAreaRef })}
                </TabsContent>
            ))}

            {currentPanel.renderDialog?.({
                open: searchDialogOpen,
                onClose: () => { setSearchDialogOpen(false) },
            })}
        </Tabs>
    );
}
