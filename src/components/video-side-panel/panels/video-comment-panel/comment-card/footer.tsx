"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faThumbsUp, faComment, faPalette, faClipboardList, faHammer, faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import type { IssueStatusCategory } from "@/server/lib/issue-tracker/tracker";
import { useCommentStore } from "@/stores/comment-store";
import { VideoComment } from "@/lib/db-types";
import { TimelineCardFooter } from "@/components/video-side-panel/timeline-card";
import { api } from "@/lib/api-client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CommentCardFooter(props: { comment: VideoComment }) {
    // The status name itself varies by workflow, so the chip shows the tracker's category and keeps the name for hover.
    const STATUS_ICON: Record<IssueStatusCategory, { icon: IconDefinition; tone: string }> = {
        new: { icon: faClipboardList, tone: "text-background" },
        indeterminate: { icon: faHammer, tone: "text-warning-strong" },
        done: { icon: faCircleCheck, tone: "text-success" },
    };

    const { incrementThumbsUpCount } = useCommentStore();
    const issue = useCommentStore((s) => (props.comment.issueId ? s.issues[props.comment.issueId] : undefined));
    const [externalLinks, setExternalLinks] = useState<Record<string, string> | null>(null);

    const handleLike = (id: string) => {
        incrementThumbsUpCount(id);
    }

    const openExternalLink = async (type: "slack" | "jira") => {
        // jump from cache
        if (externalLinks?.[type]) {
            window.open(externalLinks[type], "_blank", "noreferrer");
            return;
        }

        const res = await api.comments[":id"]["external-links"].$get({ param: { id: props.comment.id } });
        if (res.status !== 200) {
            return;
        }

        const links = await res.json();
        setExternalLinks(links);
        if (links[type]) {
            window.open(links[type], "_blank", "noreferrer");
        }
    }

    const hasIssueId = props.comment.issueId !== "" && props.comment.issueId !== null;
    const notifiedProviders = props.comment.notifiedProviders;
    const hasSlackMessage = notifiedProviders.includes("slack");
    const hasDrawing = props.comment.hasDrawing;

    return (
        <TimelineCardFooter>
            <div className="flex flex-wrap justify-end gap-1">
                {hasIssueId && (
                    <Button variant="chip" size="chip" className="group" title={issue && (issue.summary ? `${issue.status.name}: ${issue.summary}` : issue.status.name)} onClick={async () => await openExternalLink("jira")}>
                        {issue && <FontAwesomeIcon icon={STATUS_ICON[issue.status.category].icon} className={`${STATUS_ICON[issue.status.category].tone} group-hover:text-primary`} />}
                        <span className="text-info group-hover:text-primary group-hover:underline">{props.comment.issueId}</span>
                    </Button>
                )}
                {hasSlackMessage && (
                    <Button variant="chip" size="chip" onClick={async () => await openExternalLink("slack")}>
                        <FontAwesomeIcon icon={faComment} />
                        Slack
                    </Button>
                )}
                {hasDrawing && (
                    <Button variant="chip" size="chip">
                        <FontAwesomeIcon icon={faPalette} />
                    </Button>
                )}
                <Button
                    variant="chip"
                    size="chip"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleLike(props.comment.id);
                    }}
                >
                    <FontAwesomeIcon icon={faThumbsUp} />
                    {props.comment.thumbsUp ?? 0}
                </Button>
            </div>
        </TimelineCardFooter>
    );
}

