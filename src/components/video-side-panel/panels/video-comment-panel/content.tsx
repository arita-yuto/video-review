"use client";

import { Separator } from "@/ui/separator";
import { usePlayback } from "@/stores/playback-store";
import { captureView } from "@/lib/drawing/capture-view";
import { useCommentStore } from "@/stores/comment-store";
import { useAuthStore } from "@/stores/auth-store";
import { useVideoStore } from "@/stores/video-store";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import CommentConfirmed from "@/components/video-side-panel/panels/video-comment-panel/comment-confirmed";
import { useDrawingStore } from "@/stores/drawing-store";
import { useEffect, useRef } from "react";
import CommentCard from "@/components/video-side-panel/panels/video-comment-panel/comment-card";
import { cardAnchors, cardAnchorTop, cardEdges } from "@/components/video-side-panel/timeline-card-list";
import { flowTarget, followStep, type FollowState } from "@/lib/list-flow";
import { useCommentSearchStore } from "@/stores/comment-search-store";
import { useCommentSearchDateFilterStore } from "@/stores/date-filter-store";
import { chatToast } from "@/components/chat-notice";
import { canEditComment, isGuest } from "@/lib/role";
import { useSyncing } from "@/lib/sync-session";

export default function VideoCommentContent() {
    const containerRef = useRef<HTMLDivElement>(null);
    const commentCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const { displayName, email, userId, role } = useAuthStore();
    const { selectedVideo, selectedRevision } = useVideoStore();
    const { setDisplayComments, comments, liveComments, addComment, updateComment, fetchComments, markRead } = useCommentStore();
    const { filterText } = useCommentSearchStore();
    const dateFilter = useCommentSearchDateFilterStore();
    const { canvasSave } = useDrawingStore();
    const currentTime = usePlayback((s) => s.currentTime);
    const isPlaying = usePlayback((s) => s.isPlaying);
    const selectedComment = useVideoReviewStore((s) => s.selectedComment);
    const selectionSource = useVideoReviewStore((s) => s.selectionSource);
    const syncing = useSyncing(selectedVideo?.id ?? null);
    const {
        editingComment,
        setEditing,
        setEditDrawing,
        setEditComment,
        setEditIssueId,
        editSave,
    } = useCommentEditStore();

    useEffect(() => {
        // Someone else's comment arriving live is not read until the viewer opens the video again.
        if (!userId || isGuest(role) || !selectedVideo || comments === liveComments) {
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
                // A sync session's comments flow like a chat, so they send no notices.
                if (!syncing) {
                    await handlePostCommentToChat(id);
                }
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

    // A live refresh, as when someone else comments, leaves a still reader where they were.
    const scrolledAt = useRef<number | null>(null);

    useEffect(() => {
        // While playing the list flows with the time instead; this only answers seeks and refreshes while paused.
        if (isPlaying) {
            return;
        }
        if (comments === liveComments && scrolledAt.current === currentTime) {
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

        // Keep the list still on the card the reader clicked; once the time moves off that card, any change scrolls again.
        if (!isPlaying && selectionSource === "card" && selectedComment?.time === currentTime) {
            return;
        }

        const el = commentCardRefs.current[target.id];
        const list = containerRef.current;

        if (!el || !list) return;
        scrolledAt.current = currentTime;

        const { top, bottom } = cardEdges(list, el);

        // Like a chat: a card in view is left alone, one above comes down to the top edge, one below lands where playback would hold it.
        if (top >= list.scrollTop && bottom <= list.scrollTop + list.clientHeight) {
            return;
        }
        list.scrollTo({
            top: top < list.scrollTop ? top - 5 : cardAnchorTop(list, el),
            behavior: "smooth",
        });
    }, [currentTime, comments]);

    // The reader's pointer over the list means they are reading or scrolling it themselves, so the flow lets go until it leaves.
    const pointerOverList = useRef(false);
    useEffect(() => {
        const list = containerRef.current;
        if (!list) {
            return;
        }

        const enter = () => { pointerOverList.current = true; };
        const leave = () => { pointerOverList.current = false; };
        list.addEventListener("pointerenter", enter);
        list.addEventListener("pointerleave", leave);
        return () => {
            list.removeEventListener("pointerenter", enter);
            list.removeEventListener("pointerleave", leave);
        };
    }, []);

    // Playing, the list flows with the video like a comment ticker: steady between comments, never a jump.
    const videoElement = useVideoReviewStore((s) => s.videoRefElement);
    useEffect(() => {
        const list = containerRef.current;
        if (!isPlaying || !videoElement || !list || comments.length === 0) {
            return;
        }

        const cards = comments.flatMap((comment) => {
            const el = commentCardRefs.current[comment.id];
            return el ? [{ el, time: comment.time }] : [];
        });

        let state: FollowState = { top: list.scrollTop, catchingUp: false };
        let last = performance.now();

        const flow = (now: number) => {
            const elapsed = now - last;
            last = now;
            if (pointerOverList.current) {
                state = { top: list.scrollTop, catchingUp: false };
            } else {
                // Anchors are read every frame, since a card can change height while it is in view.
                state = followStep(state, flowTarget(cardAnchors(list, cards), videoElement.currentTime), elapsed);
                list.scrollTop = state.top;
            }
            frame = requestAnimationFrame(flow);
        };
        let frame = requestAnimationFrame(flow);
        return () => cancelAnimationFrame(frame);
    }, [isPlaying, videoElement, comments]);

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
