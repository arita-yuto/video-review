"use client";

import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { useLocale } from "@/app/locale-provider";
import { TableCell, TableRow } from "@/ui/table";
import { IconAction } from "@/components/admin/icon-action";

// Ties the disclosure button on the video row to the child rows it reveals.
export const revisionRowId = (videoId: string, revision: number) => `video-${videoId}-rev-${revision}`;

export function RevisionRow({ videoId, title, revision, uploadedAt, onDelete }: {
    videoId: string;
    title: string;
    revision: number;
    uploadedAt: string;
    onDelete: () => void;
}) {
    const t = useTranslations("admin-settings");
    const { locale } = useLocale();

    return (
        <TableRow id={revisionRowId(videoId, revision)}>
            <TableCell />
            <TableCell colSpan={4}>
                <span className="text-muted-foreground">
                    {t("videos.revisionRow", {
                        revision,
                        date: new Date(uploadedAt).toLocaleDateString(locale),
                    })}
                </span>
            </TableCell>
            <TableCell>
                <div className="flex justify-end">
                    <IconAction
                        icon={Trash2}
                        tooltip={t("videos.delete.action")}
                        label={t("videos.delete.revisionLabel", { revision, title })}
                        onClick={onDelete}
                    />
                </div>
            </TableCell>
        </TableRow>
    );
}
