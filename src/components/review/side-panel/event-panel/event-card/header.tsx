"use client";

import { TimelineCardHeader } from "@/components/review/side-panel/timeline-card";
import { TimeBadge } from "@/components/review/side-panel/time-badge";
import { VideoEventWithKind } from "@/lib/db-types";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/ui/dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV, faLink } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { ShareLinkDialog } from "@/components/controls/share-link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useVideoStore } from "@/components/stores/video-store";
import { createVideoEventLink } from "@/lib/url";

function DropdownMenu_SharedLink(props: { eventContentId: string }) {
    const t = useTranslations("video-comment-panel");
    const [open, setOpen] = useState(false);
    const { selectedVideo, selectedRevision } = useVideoStore();

    const createLink = () => {
        if (!selectedVideo || !selectedRevision) {
            return "";
        }
        
        return createVideoEventLink(window.location.origin, selectedVideo?.id, selectedRevision?.id, props.eventContentId) ?? "";
    }

    return (
        <>
            <DropdownMenuItem
                onClick={() => { setOpen(true) }}
                onSelect={(e) => { e.preventDefault() }}>
                <FontAwesomeIcon icon={faLink} />
                {t("commentItemCopyLink")}
            </DropdownMenuItem>
            <ShareLinkDialog url={createLink()} open={open} onOpenChange={setOpen} />
        </>
    );
}

export default function EventCardHeader(props: { event: VideoEventWithKind }) {
    return (
        <TimelineCardHeader>
            <div className="flex flex-col leading-none gap-1">
                <span className="text-sm font-medium">{props.event.kind.label}</span>
                <div className="mb-2 flex gap-1">
                    <TimeBadge seconds={props.event.startMs / 1000} />
                    <TimeBadge seconds={props.event.endMs / 1000} muted />
                </div>
            </div>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                        <FontAwesomeIcon icon={faEllipsisV} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenu_SharedLink eventContentId={props.event.contentId ?? ""} />
                    {
                        props.event.links.map((link, idx) => (
                            <DropdownMenuItem key={idx}
                                onClick={() => { window.open(link.url, "_blank") }}
                                onSelect={(e) => { e.preventDefault() }}>
                                <FontAwesomeIcon icon={faLink} />
                                {link.label ?? link.url}
                            </DropdownMenuItem>
                        ))
                    }
                </DropdownMenuContent>
            </DropdownMenu>
        </TimelineCardHeader>
    );
}
