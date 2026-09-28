"use client";

import { Separator } from "@/ui/separator";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { captureView } from "@/lib/drawing/capture-view";
import { useCommentStore } from "@/stores/comment-store";
import { useAuthStore } from "@/stores/auth-store";
import { useVideoStore } from "@/stores/video-store";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import CommentConfirmed from "@/components/video-side-panel/panels/video-comment-panel/comment-confirmed";
import { useDrawingStore } from "@/stores/drawing-store";
import { RefObject, useEffect, useRef } from "react";
import CommentCard from "@/components/video-side-panel/panels/video-comment-panel/comment-card";
import { useCommentSearchStore } from "@/stores/comment-search-store";
import { useCommentSearchDateFilterStore } from "@/stores/date-filter-store";
import { chatToast } from "@/components/chat-notice";

export default function VideoCommentContent(props: {
    topAreaRef: RefObject<HTMLDivElement | null>,
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const commentCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const { displayName, email, userId } = useAuthStore();
    const { selectedVideo, selectedRevision } = useVideoStore();
    const { setDisplayComments, comments, addComment, fetchComments, markRead } = useCommentStore();
    const { filterText } = useCommentSearchStore();
    const dateFilter = useCommentSearchDateFilterStore();
    const { canvasSave } = useDrawingStore();
    const { currentTime } = useVideoReviewStore();
    const {
        editingComment,
        setEditing,
        setEditDrawingPath,
        setEditComment,
        setEditIssueId,
        editSave,
    } = useCommentEditStore();

    useEffect(() => {
        if (!userId || !selectedVideo) return;
        markRead(userId, selectedVideo.id);
    }, [comments]);

    const handleCommentConfirmed = async (comment: string, issueId: string | null) => {
        // This handler is responsible for both creating new comments
        // and updating existing ones.
        // Currently, these two flows are intentionally separated:
        // - New comments are posted to Slack
        // - Edited comments stay local and are not re-sent
        //
        // This is a temporary design and may be refactored in the future
        // to unify comment creation / update logic.
        if (!editingComment) {
            if (selectedRevision) {
                const id = await addComment({
                    videoId: selectedRevision?.videoId,
                    videoRevNum: selectedRevision?.revision,
                    userName: displayName ?? "unknown",
                    comment: comment,
                    issueId: issueId,
                    time: currentTime,
                    userEmail: email ?? "",
                })
                await handlePostCommentToChat(id);
            }
        } else {
            // Update flow for an existing comment.
            // Edited comments are not sent to Slack to avoid duplicate or noisy notifications.
            const drawingPath = await canvasSave(editingComment.drawingPath ?? null);
            setEditDrawingPath(drawingPath);
            setEditComment(comment);
            setEditIssueId(issueId);
            editSave();
        }
    }

    const handlePostCommentToChat = async (id: string) => {
        const screenshot = await captureView();
        return await chatToast(id, screenshot);
    }

    useEffect(() => {
        // Find the latest comment whose timestamp is <= current playback time.
        // We assume `comments` is sorted by time in ascending order.
        let target = comments[0];
        if (target === undefined || !props.topAreaRef.current) {
            return;
        }

        for (const comment of comments) {
            if (comment.time <= currentTime) {
                target = comment;
            } else {
                break;
            }
        }

        // Calculate the vertical offset to keep the target comment fully visible.
        // Add a small margin (+5px) because the comment tends to be partially hidden
        // under the fixed header without this extra spacing.
        const headerHeight = props.topAreaRef.current.getBoundingClientRect().height + 5;
        const el = commentCardRefs.current[target.id];

        if (!el || !containerRef.current) return;

        containerRef.current.scrollTo({
            top: el.offsetTop - headerHeight,
            behavior: "smooth",
        });
    }, [currentTime, comments]);

    useEffect(() => {
        setDisplayComments(comments);
    }, [comments]);

    useEffect(() => {
        if (selectedRevision) {
            fetchComments(selectedRevision);
        }
    }, [dateFilter.mode, dateFilter.from, dateFilter.to, dateFilter.days, filterText]);

    return (
        <div className="bg-sidebar w-full h-full flex flex-col border-r">
            <CommentCard comments={comments} containerRef={containerRef} commentCardRef={commentCardRefs} />

            <Separator />
            <CommentConfirmed
                confirmedLabel={editingComment ? "commentUpdate" : "commentAdd"}
                comment={editingComment ? editingComment.comment : ""}
                issueId={editingComment ? editingComment.issueId ?? null : null}
                onCancel={() => setEditing(null)}
                onConfirmed={async (comment, issueId) => { await handleCommentConfirmed(comment, issueId) }}
            />
        </div>
    );
}
