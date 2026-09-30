"use client";

import { useVideoReviewStore } from "@/stores/video-review-store";
import { usePlayback } from "@/stores/playback-store";
import { VideoComment } from "@/lib/db-types";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import React, { useEffect } from "react";
import TimelineCardList from "@/components/video-side-panel/timeline-card-list";
import type { TimelineCardState } from "@/components/video-side-panel/timeline-card";
import CommentCardHeader from "@/components/video-side-panel/panels/video-comment-panel/comment-card/header";
import CommentCardContent from "@/components/video-side-panel/panels/video-comment-panel/comment-card/content";
import CommentCardFooter from "@/components/video-side-panel/panels/video-comment-panel/comment-card/footer";

// Priority: user selection, then playback position, then what the comment carries.
export function commentCardState(comment: VideoComment, selected: boolean, active: boolean): TimelineCardState {
    const hasDrawing = comment.drawingPath !== "" && comment.drawingPath !== null;
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

    const handleSelectComment = (comment: VideoComment) => {
        setTimelineTime(comment.time)
        setSelectComment(comment);
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
