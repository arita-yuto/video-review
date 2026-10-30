import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Mark, MarkScope } from "@/components/review/browser/marks/marks";

export const unreadCommentsMark: Mark = {
    key: "unread-comments",
    isShown: (video, { unreadVideoIds }) => unreadVideoIds.has(video.id),
    render: (count, scope) => <UnreadCommentsIcon count={count} scope={scope} />,
};

function UnreadCommentsIcon({ count, scope }: { count: number; scope: MarkScope }) {
    const t = useTranslations("video-list-panel");
    const label = scope === "video" ? t("unreadComments") : t("unreadCommentVideos", { count });

    return (
        <MessageSquare aria-label={label} className="size-4 shrink-0 text-primary">
            <title>{label}</title>
        </MessageSquare>
    );
}
