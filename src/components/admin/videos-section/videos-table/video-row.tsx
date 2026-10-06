"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useLocale } from "@/app/locale-provider";
import { Button } from "@/ui/button";
import { TableCell, TableRow } from "@/ui/table";
import { IconAction } from "@/components/admin/icon-action";
import { revisionRowId } from "@/components/admin/videos-section/videos-table/revision-row";
import type { VideoWithRevisionList } from "@/lib/db-types";

// The row's own delete reaches every revision below it.
export function VideoRow({ video, expanded, onToggle, onDelete }: {
    video: VideoWithRevisionList;
    expanded: boolean;
    onToggle: () => void;
    onDelete: () => void;
}) {
    const t = useTranslations("admin-settings");
    const { locale } = useLocale();

    return (
        <TableRow>
            <TableCell>
                {/* With one revision the child row would only repeat the count, and its delete
                    would do what this row's already does. */}
                {video.revisions.length > 1 && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        aria-expanded={expanded}
                        aria-controls={video.revisions.map(r => revisionRowId(video.id, r.revision)).join(" ")}
                        aria-label={t("videos.toggleRevisions", { title: video.title })}
                    >
                        {expanded ? <ChevronDown /> : <ChevronRight />}
                    </Button>
                )}
            </TableCell>
            <TableCell>{video.title}</TableCell>
            <TableCell>{video.folderKey}</TableCell>
            <TableCell>{new Date(video.latestUpdatedAt).toLocaleDateString(locale)}</TableCell>
            <TableCell>{video.revisions.length}</TableCell>
            <TableCell>
                <div className="flex justify-end">
                    <IconAction
                        icon={Trash2}
                        tooltip={t("videos.delete.action")}
                        label={t("videos.delete.wholeLabel", { title: video.title })}
                        onClick={onDelete}
                    />
                </div>
            </TableCell>
        </TableRow>
    );
}
