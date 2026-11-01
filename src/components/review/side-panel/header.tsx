"use client";

import { TabsList, TabsTrigger } from "@/ui/tabs";
import { SidebarHeader } from "@/ui/sidebar";
import { Separator } from "@/ui/separator";
import { VideoSidePanelDefinition } from "@/components/review/side-panel/types";

export default function VideoSidePanelHeader(props: {
    panels: VideoSidePanelDefinition[];
    currentPanel: VideoSidePanelDefinition;
    openDialog: () => void;
}) {
    const hasHeaderBody = props.currentPanel.renderHeaderBody !== undefined;

    return (
        <SidebarHeader>
            <div className="flex justify-between text-primary font-semibold text-sm">
                <TabsList className="h-8">
                    {props.panels.map((panel) => (
                        <TabsTrigger key={panel.key} value={panel.key} variant="accent">
                            {panel.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {props.currentPanel.renderHeaderActions?.({ openDialog: props.openDialog })}
            </div>

            {hasHeaderBody
                ? (
                    <>
                        <Separator />
                        {props.currentPanel.renderHeaderBody?.()}
                    </>
                )
                : null}
            <Separator />
        </SidebarHeader>
    );
}
