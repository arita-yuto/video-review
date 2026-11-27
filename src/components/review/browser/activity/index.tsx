"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/ui/button";
import { useSidebar } from "@/ui/sidebar";
import { useLinkedComment } from "@/components/review/hooks/use-linked-comment";
import { usePlayback } from "@/components/review/stores/playback-store";
import { useVideoReviewStore } from "@/components/review/stores/video-review-store";
import { useVideoStore } from "@/components/stores/video-store";
import { ActivityDialog } from "@/components/review/browser/activity/activity-dialog";
import type { ActivityEntry } from "@/components/review/browser/activity/activity-row";

export function Activity() {
    const t = useTranslations("activity");
    const router = useRouter();
    const { setOpenMobile } = useSidebar();
    const selectLinkedComment = useLinkedComment();
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const setSelectComment = useVideoReviewStore((s) => s.setSelectComment);
    const [open, setOpen] = useState(false);

    // The page applies a URL only when it changes, so an entry whose URL is already open is applied here.
    const openLoadedVideoEntry = (entry: ActivityEntry) => {
        const { selectedVideo, selectedRevision, revisions, selectVideoRevision } = useVideoStore.getState();

        if (selectedVideo?.id !== entry.video.id) {
            return;
        }

        if (entry.videoRevisionId && entry.videoRevisionId !== selectedRevision?.id) {
            const target = revisions.find((revision) => revision.id === entry.videoRevisionId);

            if (!target) {
                return;
            }

            selectVideoRevision(target);
        }

        // An upload names no comment, which the page shows as nothing selected.
        if (entry.kind === "upload") {
            setTimelineTime(null);
            setSelectComment(null);
            return;
        }

        selectLinkedComment(entry.commentId);
    };

    const openEntry = (entry: ActivityEntry) => {
        const query = new URLSearchParams();

        if (entry.kind !== "upload") {
            query.set("comment", entry.commentId);
        }

        // The comment panel may list only the playing revision, so the comment's own revision is selected.
        if (entry.videoRevisionId) {
            query.set("revision", entry.videoRevisionId);
        }

        const path = `/video-review/review/${entry.video.id}`;
        const current = new URLSearchParams(window.location.search);
        // The parameters the page applies; any other, such as the sync session's, does not make it apply again.
        const applied = ["revision", "event", "t", "comment"];
        const alreadyOpen = window.location.pathname === path && applied.every((name) => current.get(name) === query.get(name));

        router.replace(`${path}?${query.toString()}`);

        if (alreadyOpen) {
            openLoadedVideoEntry(entry);
        }

        setOpen(false);
        setOpenMobile(false);
    };

    return (
        <>
            <Button variant="toolbar" size="icon-sm" title={t("title")} onClick={() => setOpen(true)}>
                <Bell />
            </Button>

            <ActivityDialog open={open} onOpenChange={setOpen} onSelect={openEntry} />
        </>
    );
}
