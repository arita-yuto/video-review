"use client";

import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";
import { Input } from "@/ui/input";
import { Spinner } from "@/ui/spinner";
import { useEffect, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { usePlayback } from "@/stores/playback-store";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";
import { isGuest } from "@/lib/role";
import { useVideoStore } from "@/stores/video-store";
import { useSyncing } from "@/lib/sync-session";
import { isMac } from "@/lib/platform";
import { api } from "@/lib/api-client";

// The OS never changes while the page is open, so there is nothing to subscribe to.
const subscribeNever = () => () => {};

export type ECommentConfirmedType = "commentUpdate" | "commentAdd";

// What the issue field found out about the typed key; null when there is no key to look up.
type IssueLookup = "checking" | { key: string; summary: string } | { key: string; error: string } | null;

export default function CommentConfirmed(props: {
    confirmedLabel: ECommentConfirmedType;
    onConfirmed: (comment: string, issueId: string | null) => void;
    onCancel: () => void;
    issueId: string | null;
    comment: string;
    canEditText: boolean;
}) {
    const t = useTranslations("comment-confirmed");
    const editing = props.confirmedLabel === "commentUpdate";
    const [comment, setComment] = useState(props.comment);
    const [issueId, setIssueId] = useState(props.issueId);
    const [lookup, setLookup] = useState<IssueLookup>(null);
    const setIsPlaying = usePlayback((s) => s.setIsPlaying);
    const { role } = useAuthStore();
    const syncing = useSyncing(useVideoStore((s) => s.selectedVideo?.id ?? null));

    // Writing pauses so the comment lands on the frame in view; a sync session watches on, like a chat.
    const pauseToWrite = () => {
        if (!syncing) {
            setIsPlaying(false);
        }
    };

    const key = issueId?.trim() ?? "";

    // The typed key is looked up a moment after typing stops.
    useEffect(() => {
        if (key === "") {
            setLookup(null);
            return;
        }

        setLookup("checking");
        let stale = false;
        const timer = setTimeout(async () => {
            const res = await api.comments["issue-lookup"].$get({ query: { key } }).catch(() => null);
            const body = res?.status === 200 || res?.status === 404 ? await res.json() : null;
            if (stale) {
                return;
            }

            if (body && "summary" in body) {
                setLookup({ key, summary: body.summary });
            } else if (body && "error" in body) {
                setLookup({ key, error: body.error });
            } else {
                setLookup(null);
            }
        }, 400);

        return () => {
            stale = true;
            clearTimeout(timer);
        };
    }, [key]);

    const answer = lookup !== null && lookup !== "checking" ? lookup : null;
    const lookupFailed = answer !== null && "error" in answer;
    // A key already saved on the comment stays editable even if the tracker lost the issue.
    const rejectedKey = lookupFailed && answer.key === key && key !== (props.issueId?.trim() ?? "");

    // An edit is cleared by its props once it closes; an add must clear itself.
    const handleConfirmed = () => {
        props.onConfirmed(comment, issueId);
        if (!editing) {
            setIssueId(null);
            setComment("");
        }
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
        if (rejectedKey || (!editing && !canAddComment())) {
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
            {editing && (
                <>
                    <Input
                        disabled={isGuest(role) || !props.canEditText}
                        className="mb-2"
                        value={issueId ?? ""}
                        onChange={(e) => setIssueId(e.target.value)}
                        onFocus={pauseToWrite}
                        onKeyDown={submitOnShortcut}
                        placeholder={t("editIssueLink")}
                    />
                    {/* Once a key is typed the line keeps its height, so the buttons do not move while it is looked up. */}
                    {key !== "" && (
                        <p className={`mb-2 h-4 text-xs truncate ${lookupFailed ? "text-destructive" : "text-muted-foreground"}`}>
                            {lookup === "checking" && <Spinner />}
                            {answer && ("error" in answer ? answer.error : answer.summary)}
                        </p>
                    )}
                </>
            )}
            {editing ? (
                <div className="flex gap-2">
                    <Button variant="destructive" disabled={rejectedKey} onClick={() => handleConfirmed()} className="flex-1">
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
