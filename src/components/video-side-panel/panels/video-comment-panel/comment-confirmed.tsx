"use client";

import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";
import { Input } from "@/ui/input";
import { useEffect, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { usePlayback } from "@/stores/playback-store";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";
import { isGuest } from "@/lib/role";
import { useVideoStore } from "@/stores/video-store";
import { useSyncing } from "@/lib/sync-session";
import { isMac } from "@/lib/platform";

// The OS never changes while the page is open, so there is nothing to subscribe to.
const subscribeNever = () => () => {};

export type ECommentConfirmedType = "commentUpdate" | "commentAdd";

export default function CommentConfirmed(props: {
    confirmedLabel: ECommentConfirmedType;
    onConfirmed: (comment: string, issueId: string | null) => void;
    onCancel: () => void;
    issueId: string | null;
    comment: string;
    canEditText: boolean;
}) {
    const t = useTranslations("comment-confirmed");
    const [comment, setComment] = useState(props.comment);
    const [issueId, setIssueId] = useState(props.issueId);
    const setIsPlaying = usePlayback((s) => s.setIsPlaying);
    const { role } = useAuthStore();
    const syncing = useSyncing(useVideoStore((s) => s.selectedVideo?.id ?? null));

    // Writing pauses so the comment lands on the frame in view; a sync session watches on, like a chat.
    const pauseToWrite = () => {
        if (!syncing) {
            setIsPlaying(false);
        }
    };

    const handleConfirmed = () => {
        props.onConfirmed(comment, issueId);
        setIssueId(null);
        setComment("");
    };

    // Read in the browser only: the server cannot tell the OS, and the hint must not differ on hydration.
    const mac = useSyncExternalStore(subscribeNever, isMac, () => false);

    // Enter alone stays a new line, and an Enter that confirms the IME conversion is left to it.
    const submitOnShortcut = (e: KeyboardEvent<HTMLElement>) => {
        const modifier = mac ? e.metaKey : e.ctrlKey;
        if (e.key !== "Enter" || !modifier || e.nativeEvent.isComposing) {
            return;
        }

        e.preventDefault();
        if (props.confirmedLabel === "commentAdd" && !canAddComment()) {
            return;
        }
        handleConfirmed();
    };

    const handleCancel = () => {
        props.onCancel();
    };

    const canAddComment = () => {
        return comment !== ""
    }

    useEffect(() => {
        setComment(props.comment);
        setIssueId(props.issueId);
    }, [props.comment, props.issueId]);

    return (
        <div className="p-4 border-t bg-background">
            <Textarea
                disabled={!props.canEditText}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onFocus={pauseToWrite}
                onKeyDown={submitOnShortcut}
                placeholder={t("editComment", { keys: mac ? "⌘ Enter" : "Ctrl Enter" })}
                className="h-20 mb-2 resize-none"
            />
            <Input
                disabled={isGuest(role) || !props.canEditText}
                className="mb-2"
                value={issueId ?? ""}
                onChange={(e) => setIssueId(e.target.value)}
                onFocus={pauseToWrite}
                onKeyDown={submitOnShortcut}
                placeholder={t("editIssueLink")}
            />
            {props.confirmedLabel === "commentUpdate" ? (
                <div className="flex gap-2">
                    <Button variant="destructive" onClick={() => handleConfirmed()} className="flex-1">
                        {t(props.confirmedLabel)}
                    </Button>
                    <Button variant="secondary" onClick={() => handleCancel()} className="flex-1">
                        {t("cancel")}
                    </Button>
                </div>
            ) : (
                <Button disabled={!canAddComment()} onClick={() => handleConfirmed()} className="w-full">
                    {t(props.confirmedLabel)}
                </Button>
            )}
        </div>
    );
}
