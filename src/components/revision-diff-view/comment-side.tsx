"use client"
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { api } from "@/lib/api-client";
import { VideoComment, VideoRevision } from "@/lib/db-types";
import { createVideoTimeLink } from "@/lib/url";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";
import { usePlayback } from "@/stores/playback-store";
import TimelineCardList from "@/components/video-side-panel/timeline-card-list";
import { TimelineCardHeader } from "@/components/video-side-panel/timeline-card";
import { CommentAuthor } from "@/components/video-side-panel/panels/video-comment-panel/comment-card/header";
import CommentCardContent from "@/components/video-side-panel/panels/video-comment-panel/comment-card/content";
import { commentCardState } from "@/components/video-side-panel/panels/video-comment-panel/comment-card";

// Same window the review page uses to light up the comments at the playback position.
const ACTIVE_WINDOW_SEC = 0.3;

export function useRevisionComments(revision: VideoRevision) {
    const [comments, setComments] = useState<VideoComment[]>([]);

    useEffect(() => {
        let canceled = false;
        setComments([]);
        void (async () => {
            const res = await api.comments.index.$get({
                query: { videoId: revision.videoId, selectRevision: String(revision.revision) },
            });
            if (res.status !== 200) return;
            const body = await res.json();
            if (!canceled) setComments(body);
        })();
        return () => { canceled = true; };
    }, [revision.id]);

    return comments;
}

// Read-only; the header button opens the review page at this revision and position.
export function CommentSide({ revision, comments, markerClassName, selectedId, onSelect, onLeave }: {
    revision: VideoRevision,
    comments: VideoComment[],
    // The colour of this side's seek bar markers, repeated in the header to tell the sides apart.
    markerClassName: string,
    // One selection across both sides, so picking a card on one side clears the other.
    selectedId: string | null,
    onSelect: (comment: VideoComment) => void,
    // Called before leaving so the way back can return to the same position.
    onLeave: (time: number) => void,
}) {
    const t = useTranslations("revision-diff-view");
    const router = useRouter();
    const currentTime = usePlayback((s) => s.currentTime);
    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<Record<string, HTMLDivElement | null>>({});

    const commentHere = () => {
        onLeave(currentTime);
        const link = createVideoTimeLink("", revision.videoId, currentTime, revision.id);
        if (link) router.push(link);
    };

    return (
        <div className="flex flex-col w-80 shrink-0 min-h-0 border rounded-lg bg-card">
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
                <span className="flex items-center gap-2 text-sm font-medium">
                    <span className={cn("size-2 rounded-full", markerClassName)} />
                    Rev.{revision.revision}
                </span>
                <Button variant="ghost" size="sm" onClick={commentHere}>
                    <FontAwesomeIcon icon={faPen} />
                    {t("commentHere")}
                </Button>
            </div>
            <TimelineCardList
                items={comments}
                containerRef={containerRef}
                itemCardRef={cardRef}
                getKey={(c) => c.id}
                getCardState={(c) => {
                    const atPosition = Math.abs(c.time - currentTime) <= ACTIVE_WINDOW_SEC;
                    // Like the review page, the selection lasts only while playback stays at it.
                    return commentCardState(c, c.id === selectedId && atPosition, atPosition);
                }}
                onClick={onSelect}
                renderHeader={(c) => <TimelineCardHeader><CommentAuthor comment={c} /></TimelineCardHeader>}
                renderContent={(c) => <CommentCardContent comment={c} />}
            />
        </div>
    );
}
