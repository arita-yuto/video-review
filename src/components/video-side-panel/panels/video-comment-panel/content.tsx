"use client";

import { Separator } from "@/ui/separator";
import { usePlayback } from "@/stores/playback-store";
import { captureView } from "@/lib/drawing/capture-view";
import { useCommentStore } from "@/stores/comment-store";
import { useAuthStore } from "@/stores/auth-store";
import { useVideoStore } from "@/stores/video-store";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import CommentConfirmed from "@/components/video-side-panel/panels/video-comment-panel/comment-confirmed";
import { useDrawingStore } from "@/stores/drawing-store";
import { useEffect, useRef } from "react";
import CommentCard from "@/components/video-side-panel/panels/video-comment-panel/comment-card";
import { useCommentSearchStore } from "@/stores/comment-search-store";
import { useCommentSearchDateFilterStore } from "@/stores/date-filter-store";
import { chatToast } from "@/components/chat-notice";
import { canEditComment, isGuest } from "@/lib/role";

export default function VideoCommentContent() {
    const containerRef = useRef<HTMLDivElement>(null);
    const commentCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const { displayName, email, userId, role } = useAuthStore();
    const { selectedVideo, selectedRevision } = useVideoStore();
    const { setDisplayComments, comments, addComment, updateComment, fetchComments, markRead } = useCommentStore();
    const { filterText } = useCommentSearchStore();
    const dateFilter = useCommentSearchDateFilterStore();
    const { canvasSave } = useDrawingStore();
    const currentTime = usePlayback((s) => s.currentTime);
    const {
        editingComment,
        setEditing,
        setEditDrawing,
        setEditComment,
        setEditIssueId,
        editSave,
    } = useCommentEditStore();

    useEffect(() => {
        if (!userId || isGuest(role) || !selectedVideo) {
            return;
        }
        markRead(selectedVideo.id);
    }, [comments]);

    const canEditText = !editingComment || canEditComment(editingComment, role, userId);

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
            const saved = await canvasSave(editingComment.id);
            if (saved) {
                setEditDrawing(saved);
            }

            // Someone else's comment: only the drawing is saved.
            if (!canEditText) {
                if (saved) {
                    updateComment(saved);
                }
                setEditing(null);
                return;
            }

            setEditComment(comment);
            setEditIssueId(issueId);
            editSave();
        }
    }

    const handlePostCommentToChat = async (id: string) => {
        const screenshot = await captureView();
        return await chatToast(id, screenshot);
    }

    // A list that only refreshed, as when someone else comments, stays where the reader left it.
    const scrolledFor = useRef<{ time: number; revisionId: string | null } | null>(null);

    useEffect(() => {
        const revisionId = selectedRevision?.id ?? null;
        const last = scrolledFor.current;
        if (last && last.time === currentTime && last.revisionId === revisionId) {
            return;
        }

        // Find the latest comment whose timestamp is <= current playback time.
        // We assume `comments` is sorted by time in ascending order.
        let target = comments[0];
        if (target === undefined) {
            return;
        }

        for (const comment of comments) {
            if (comment.time <= currentTime) {
                target = comment;
            } else {
                break;
            }
        }

        const el = commentCardRefs.current[target.id];

        if (!el || !containerRef.current) return;
        scrolledFor.current = { time: currentTime, revisionId };

        // Both offsets are from the same offset parent, so the difference is the card's position in the list.
        // The 5px keeps the card clear of the list's edge.
        containerRef.current.scrollTo({
            top: el.offsetTop - containerRef.current.offsetTop - 5,
            behavior: "smooth",
        });
    }, [currentTime, comments, selectedRevision?.id]);

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
                canEditText={canEditText}
                issueId={editingComment ? editingComment.issueId ?? null : null}
                onCancel={() => setEditing(null)}
                onConfirmed={async (comment, issueId) => { await handleCommentConfirmed(comment, issueId) }}
            />
        </div>
    );
}
