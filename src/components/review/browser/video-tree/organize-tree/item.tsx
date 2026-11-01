import type { ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { FolderPlus, Pencil } from "lucide-react";
import type { VideoWithRevision } from "@/lib/db-types";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import { VideoItemButton } from "@/components/review/browser/video-tree/nodes/item/video-item";

// A video with only what tells it apart when organizing: the thumbnail and the whole title.
export function OrganizeItemButton({ video, ...props }: { video: VideoWithRevision } & ComponentProps<"button">) {
    return (
        <VideoItemButton {...props} video={video}>
            <div className="min-w-0 flex-1 text-base font-medium wrap-break-word">{video.title}</div>
        </VideoItemButton>
    );
}

// The pencil beside an item or folder header that starts renaming it, shown on hover or focus.
export function RenameAction({ onClick }: { onClick: () => void }) {
    const t = useTranslations("video-list-panel.organize.rename");

    return (
        <SidebarMenuAction showOnHover title={t("action")} onClick={onClick}>
            <Pencil />
        </SidebarMenuAction>
    );
}

// Makes a folder inside this one, or at the top level from Top.
export function NewFolderAction({ onClick }: { onClick: () => void }) {
    const t = useTranslations("video-list-panel.organize");

    return (
        <SidebarMenuAction showOnHover place="second" title={t("newFolder")} onClick={onClick}>
            <FolderPlus />
        </SidebarMenuAction>
    );
}
