import { Fragment, type ReactNode } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import type { MarkContext } from "@/components/review/browser/marks/use-mark-context";
import { newMark } from "@/components/review/browser/marks/parts/new-mark";
import { unreadCommentsMark } from "@/components/review/browser/marks/parts/unread-comments-mark";

// A row marks one video; a folder header marks the videos inside it.
export type MarkScope = "video" | "folder";

// One mark: when it applies to a video, and how it looks.
export type Mark = {
    key: string;
    isShown: (video: VideoWithRevision, context: MarkContext) => boolean;
    // `count` is how many of the videos it applies to: 1 on a row, any number on a header.
    render: (count: number, scope: MarkScope) => ReactNode;
};

// Every mark, in the order they line up.
const MARKS: Mark[] = [newMark, unreadCommentsMark];

type Props = {
    videos: VideoWithRevision[];
    scope: MarkScope;
    context: MarkContext;
};

// The right edge of a list row, where marks line up in one column across headers and rows.
export function Marks({ videos, scope, context }: Props) {
    const shown = MARKS
        .map((mark) => ({ mark, count: videos.filter((video) => mark.isShown(video, context)).length }))
        .filter(({ count }) => count > 0);

    // Nothing at all, so a row without marks keeps its full width for the title.
    if (shown.length === 0) {
        return null;
    }

    return (
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
            {shown.map(({ mark, count }) => <Fragment key={mark.key}>{mark.render(count, scope)}</Fragment>)}
        </span>
    );
}
