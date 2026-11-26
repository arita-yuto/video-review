"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faThumbsUp } from "@fortawesome/free-solid-svg-icons";
import { useCommentStore, type ReactionKind } from "@/components/review/stores/comment-store";
import { useAuthStore } from "@/components/stores/auth-store";
import { VideoComment } from "@/lib/db-types";
import { isGuest } from "@/lib/role";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PeopleList } from "@/components/controls/people-list";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

function ReactionChip(props: { comment: VideoComment; kind: ReactionKind; icon: IconDefinition }) {
    const t = useTranslations("video-comment-panel");
    const { addReaction, removeReaction } = useCommentStore();
    const userId = useAuthStore((s) => s.userId);
    const role = useAuthStore((s) => s.role);

    const reactions = props.comment.reactions.filter((reaction) => reaction.kind === props.kind);
    const canReact = !isGuest(role);
    const pressed = canReact && reactions.some((reaction) => reaction.userId === userId);
    const people = reactions.map((reaction) => ({ name: reaction.userName, email: reaction.userEmail }));

    const toggle = () => {
        if (!canReact) {
            return;
        }

        const change = pressed ? removeReaction : addReaction;
        change(props.comment.id, props.kind).catch((e: Error) => toast.error(`${t("reactionFailed")}: ${e.message}`));
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant={pressed ? "chip-pressed" : "chip"}
                    size="chip"
                    aria-pressed={pressed}
                    // Not `disabled`: that turns pointer events off, and the names show on hover.
                    aria-disabled={!canReact}
                    onClick={(e) => {
                        e.stopPropagation();
                        toggle();
                    }}
                >
                    <FontAwesomeIcon icon={props.icon} />
                    {reactions.length}
                </Button>
            </TooltipTrigger>
            {people.length > 0 && (
                <TooltipContent>
                    <PeopleList people={people} />
                </TooltipContent>
            )}
        </Tooltip>
    );
}

export function ReactionChips(props: { comment: VideoComment }) {
    const REACTION_ICON: Record<ReactionKind, IconDefinition> = {
        thumbsUp: faThumbsUp,
    };

    const kinds = Object.keys(REACTION_ICON) as ReactionKind[];

    return (
        <>
            {kinds.map((kind) => (
                <ReactionChip key={kind} comment={props.comment} kind={kind} icon={REACTION_ICON[kind]} />
            ))}
        </>
    );
}
