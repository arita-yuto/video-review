"use client";

import { useVideoReviewStore } from "@/components/review/stores/video-review-store";
import { usePlayback } from "@/components/review/stores/playback-store";
import { VideoComment } from "@/lib/db-types";
import { useCommentEditStore } from "@/components/review/stores/comment-edit-store";
import { usePresenterLock } from "@/components/review/sync-session";
import React, { useEffect } from "react";
import TimelineCardList from "@/components/review/side-panel/timeline-card-list";
import type { TimelineCardState } from "@/components/review/side-panel/timeline-card";
import CommentCardHeader from "@/components/review/side-panel/comment-panel/comment-card/header";
import CommentCardContent from "@/components/review/side-panel/comment-panel/comment-card/content";
import CommentCardFooter from "@/components/review/side-panel/comment-panel/comment-card/footer";

export function commentCardState(comment: VideoComment, selected: boolean, active: boolean): TimelineCardState {
    const hasDrawing = comment.hasDrawing;
    const hasIssue = comment.issueId !== "" && comment.issueId !== null;

    if (selected) return "selected";
    if (active) return "active";
    if (hasIssue && hasDrawing) return "issue-drawing";
    if (hasIssue) return "issue";
    if (hasDrawing) return "drawing";
    return "none";
}

export default function CommentCard(props: {
    comments: VideoComment[],
    containerRef: React.RefObject<HTMLDivElement | null>,
    commentCardRef: React.RefObject<Record<string, HTMLDivElement | null>>,
}) {
    const { editingComment, setEditing } = useCommentEditStore();
    const { selectedComment, setSelectComment, activeComments } = useVideoReviewStore();
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const locked = usePresenterLock();

    const handleSelectComment = (comment: VideoComment) => {
        // Under a presenter the frame is theirs: a click must not seek, and a selection would draw on their frame.
        if (locked) {
            return;
        }
        setTimelineTime(comment.time);
        setSelectComment(comment, "card");
    }

    useEffect(() => {
        if (!selectedComment) return;
        if (editingComment && editingComment.id !== selectedComment.id) {
            setEditing(null);
        }
    }, [selectedComment]);

    return (
        <TimelineCardList
            items={props.comments}
            containerRef={props.containerRef}
            itemCardRef={props.commentCardRef}
            getKey={(comment) => comment.id}
            getCardState={(comment) => commentCardState(
                comment,
                selectedComment?.id === comment.id,
                activeComments.some(e => e.id === comment.id),
            )}
            onClick={(comment) => { handleSelectComment(comment) }}
            renderHeader={(comment) => <CommentCardHeader comment={comment} />}
            renderContent={(comment) => <CommentCardContent comment={comment} />}
            renderFooter={(comment) => <CommentCardFooter comment={comment} />}
        />
    );
}
