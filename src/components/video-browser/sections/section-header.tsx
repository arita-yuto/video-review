import { Folder, FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { splitFolderPath } from "@/components/video-browser/sections/utils";

type Props = {
    folderKey: string;
    open: boolean;
    total: number;
    unread: number;
    onToggle: () => void;
};

export function SectionHeader({ folderKey, open, total, unread, onToggle }: Props) {
    const t = useTranslations("video-list-panel");
    const { parent, leaf } = splitFolderPath(folderKey);

    return (
        <button
            type="button"
            data-slot="video-section-header"
            aria-expanded={open}
            title={folderKey || "/"}
            onClick={onToggle}
            className="sticky top-0 z-10 flex w-full items-center gap-1.5 px-2 py-1.5 bg-sidebar border-b text-left text-xs hover:bg-accent"
        >
            {open
                ? <FolderOpen className="size-3.5 shrink-0 text-primary" />
                : <Folder className="size-3.5 shrink-0 text-primary" />}

            <span className="flex min-w-0 flex-1 whitespace-nowrap">
                {parent.length > 0 && (
                    <>
                        {/* The parent gives way first; the leaf names the section. */}
                        <span className="min-w-0 shrink-4 truncate text-muted-foreground">{parent.join(" / ")}</span>
                        <span className="shrink-0 px-1 text-muted-foreground">/</span>
                    </>
                )}
                <span className="min-w-0 truncate font-semibold text-primary">{leaf}</span>
            </span>

            {unread > 0 && (
                <span className="shrink-0 font-medium text-destructive">{t("unreadCount", { count: unread })}</span>
            )}
            <span className="shrink-0 tabular-nums text-muted-foreground">{total}</span>
        </button>
    );
}
