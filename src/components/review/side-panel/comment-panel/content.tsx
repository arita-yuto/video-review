"use client";

import { Separator } from "@/ui/separator";
import { usePlayback } from "@/components/review/stores/playback-store";
import { captureView } from "@/components/review/capture-view";
import { useCommentStore } from "@/components/review/stores/comment-store";
import { useAuthStore } from "@/components/stores/auth-store";
import { useVideoStore } from "@/components/stores/video-store";
import { useVideoReviewStore } from "@/components/review/stores/video-review-store";
import { useCommentEditStore } from "@/components/review/stores/comment-edit-store";
import CommentConfirmed from "@/components/review/side-panel/comment-panel/comment-confirmed";
import { useDrawingStore } from "@/components/review/stores/drawing-store";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown } from "@fortawesome/free-solid-svg-icons";
import CommentCard from "@/components/review/side-panel/comment-panel/comment-card";
import { cardAnchors, cardAnchorTop, cardEdges } from "@/components/review/side-panel/timeline-card-list";
import { flowTarget, followStep, type FollowState } from "@/lib/list-flow";
import { useCommentSearchStore } from "@/components/review/stores/comment-search-store";
import { chatToast } from "@/components/review/side-panel/comment-panel/chat-notice";
import { toast } from "sonner";
import { canEditComment, isGuest } from "@/lib/role";
import { useSyncing } from "@/components/review/sync-session";
import { Panel } from "@/components/controls/panel";

export default function VideoCommentContent() {
    const t = useTranslations("video-comment-panel");
    const containerRef = useRef<HTMLDivElement>(null);
    const commentCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const { displayName, email, userId, role } = useAuthStore();
    const { selectedVideo, selectedRevision } = useVideoStore();
    const { setDisplayComments, comments, liveComments, addComment, updateComment, fetchComments, markRead } = useCommentStore();
    const { filterText, revisionFilter } = useCommentSearchStore();
    const { canvasSave } = useDrawingStore();
    const currentTime = usePlayback((s) => s.currentTime);
    const isPlaying = usePlayback((s) => s.isPlaying);
    const selectedComment = useVideoReviewStore((s) => s.selectedComment);
    const selectionSource = useVideoReviewStore((s) => s.selectionSource);
    const videoElement = useVideoReviewStore((s) => s.videoRefElement);
    // Following stops once the viewer scrolls the list themselves, until they press the button.
    const [following, setFollowing] = useState(true);
    // The scrollTop the flow last set, to tell its own scroll events from the viewer's.
    const flowTop = useRef<number | null>(null);
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
        // A comment arriving live may not have been seen yet, so only the viewer's own fetch marks the video read.
        if (!userId || isGuest(role) || !selectedVideo || comments === liveComments) {
            return;
        }
        markRead(selectedVideo.id);
    }, [comments]);

    const canEditText = !editingComment || canEditComment(editingComment, role, userId);

    const handleCommentConfirmed = async (comment: string, issueId: string | null) => {
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
                }).catch((e: Error) => {
                    toast.error(e.message);
                    return null;
                });
                if (!id) {
                    return;
                }
                // A sync session already shows comments live, so it posts nothing to the chat.
                if (!syncing) {
                    await handlePostCommentToChat(id);
                }
            }
        } else {
            // An edit sends no chat notice; the thread already has the comment.
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

    useEffect(() => {
        const list = containerRef.current;
        if (!list) {
            return;
        }

        const onScroll = () => {
            if (flowTop.current !== null && Math.abs(list.scrollTop - flowTop.current) > 1) {
                setFollowing(false);
            }
        };
        list.addEventListener("scroll", onScroll);
        return () => list.removeEventListener("scroll", onScroll);
    }, []);

    // The currentTime the list was last placed for, so a live refresh does not move a paused viewer again.
    const scrolledAt = useRef<number | null>(null);

    useEffect(() => {
        // While paused, a seek or a list refresh scrolls to the target card; the flow handles playing.
        if (isPlaying || !following) {
            return;
        }
        if (comments === liveComments && scrolledAt.current === currentTime) {
            return;
        }

        // Comments are sorted by time, so the target is the last one at or before the current time.
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

        // A card the viewer clicked stays put until the time moves off it.
        if (selectionSource === "card" && selectedComment?.time === currentTime) {
            return;
        }

        const el = commentCardRefs.current[target.id];
        const list = containerRef.current;

        if (!el || !list) return;
        scrolledAt.current = currentTime;

        const { top, bottom } = cardEdges(list, el);

        // Scroll only when the card is out of view: up to the top edge, or down to where playback would hold it.
        if (top >= list.scrollTop && bottom <= list.scrollTop + list.clientHeight) {
            return;
        }
        list.scrollTo({
            top: top < list.scrollTop ? top - 5 : cardAnchorTop(list, el),
            behavior: "smooth",
        });
    }, [currentTime, comments, isPlaying, following]);

    // While playing, the flow scrolls the list with the video so it never jumps between comments.
    useEffect(() => {
        const list = containerRef.current;
        if (!isPlaying || !following || !videoElement || !list || comments.length === 0) {
            return;
        }

        const cards = comments.flatMap((comment) => {
            const el = commentCardRefs.current[comment.id];
            return el ? [{ el, time: comment.time }] : [];
        });
        if (cards.length === 0) {
            return;
        }

        let state: FollowState = { top: list.scrollTop, catchingUp: false };
        let last = performance.now();
        flowTop.current = list.scrollTop;

        const flow = (now: number) => {
            // Anchors are read every frame, since a card can change height while it is in view.
            const next = followStep(state, flowTarget(cardAnchors(list, cards), videoElement.currentTime), now - last);
            last = now;
            if (next !== state) {
                state = next;
                flowTop.current = state.top;
                list.scrollTop = state.top;
            }
            frame = requestAnimationFrame(flow);
        };
        let frame = requestAnimationFrame(flow);
        return () => {
            cancelAnimationFrame(frame);
            flowTop.current = null;
        };
    }, [isPlaying, following, videoElement, comments]);

    useEffect(() => {
        setDisplayComments(comments);
    }, [comments]);

    useEffect(() => {
        if (selectedRevision) {
            fetchComments(selectedRevision);
        }
    }, [revisionFilter, filterText]);

    return (
        <Panel>
            <div className="relative flex-1 min-h-0 flex flex-col">
                <CommentCard comments={comments} containerRef={containerRef} commentCardRef={commentCardRefs} />
                {!following && (
                    <Button size="sm" className="absolute bottom-3 left-1/2 -translate-x-1/2" onClick={() => setFollowing(true)}>
                        <FontAwesomeIcon icon={faArrowDown} />
                        {t("followPlayback")}
                    </Button>
                )}
            </div>

            <Separator />
            <CommentConfirmed
                confirmedLabel={editingComment ? "commentUpdate" : "commentAdd"}
                comment={editingComment ? editingComment.comment : ""}
                canEditText={canEditText}
                issueId={editingComment ? editingComment.issueId ?? null : null}
                onCancel={() => setEditing(null)}
                onConfirmed={async (comment, issueId) => { await handleCommentConfirmed(comment, issueId) }}
            />
        </Panel>
    );
}
