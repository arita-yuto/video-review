"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { api, readError } from "@/lib/api-client";
import { SidebarSearchInput } from "@/components/controls/sidebar-search-input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/ui/table";
import { DeleteConfirmDialog, type DeleteTarget } from "@/components/dialog/delete-confirm-dialog";
import { VideoRow } from "@/components/admin/videos-section/videos-table/video-row";
import { RevisionRow } from "@/components/admin/videos-section/videos-table/revision-row";
import type { VideoWithRevisionList } from "@/lib/db-types";
import { Spinner } from "@/ui/spinner";

// The filter runs on the server, so wait for a pause in typing before asking again.
const FILTER_DEBOUNCE_MS = 300;

// A fragment: the search field and the list are laid out by the AdminSection flex column.
export function VideosTable({ actions }: { actions: ReactNode }) {
    const t = useTranslations("admin-settings");

    const [videos, setVideos] = useState<VideoWithRevisionList[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("");
    const [actionError, setActionError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
    const [target, setTarget] = useState<DeleteTarget | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            setError(null);

            try {
                const res = await api.videos.index.$get({
                    query: {
                        // Query values travel as strings; the route parses them.
                        includeRevisions: "true",
                        filterTree: filter.trim() || undefined,
                    },
                });
                if (res.status !== 200) throw new Error(await readError(res));

                const rows = await res.json();
                if (cancelled) return;

                // The query asks for revisions, but the route builds the field conditionally,
                // so the response type leaves it optional. Settle it here instead of casting.
                setVideos(rows.map(row => ({ ...row, revisions: row.revisions ?? [] })));
            } catch (e) {
                if (!cancelled) setError(`${t("videos.loadFailed")}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }, videos === null ? 0 : FILTER_DEBOUNCE_MS);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [filter, reloadToken]);

    function askDelete(next: DeleteTarget) {
        setActionError(null);
        setTarget(next);
    }

    function toggleExpanded(videoId: string) {
        setExpanded(open => {
            const next = new Set(open);

            if (next.has(videoId)) next.delete(videoId);
            else next.add(videoId);

            return next;
        });
    }

    async function onDelete(target: DeleteTarget) {
        setDeleting(true);
        setActionError(null);

        let filesLeft = false;
        let failure: string | null = null;

        try {
            // Purging the last revision is what hides a video, so nothing here decides that. With
            // no revision to purge, only the flag itself can take an orphan record out of the list.
            // The route parses deleted as a string ("true" | anything else).
            if (target.whole && target.revisions.length === 0) {
                const res = await api.admin.maintenance.video.delete.$post({
                    json: { videoId: target.videoId, deleted: "true" },
                });
                if (res.status !== 200) throw new Error(await readError(res));
            }

            for (const revision of target.revisions) {
                const res = await api.admin.maintenance.video.purge.$post({
                    json: { videoId: target.videoId, revision: String(revision) },
                });

                // Partial success (HTTP 207) means the revision row is gone but its file survived:
                // worth reporting, not worth aborting. A missing revision (HTTP 404) means another
                // admin purged it first, which is the outcome we wanted anyway.
                if (![200, 207, 404].includes(res.status)) throw new Error(await readError(res));
                if (res.status === 207) filesLeft = true;
            }
        } catch (e) {
            failure = `${t("videos.delete.failed")}: ${e instanceof Error ? e.message : String(e)}`;
        }

        // Close first: the error is unreadable behind the modal.
        setTarget(null);
        setDeleting(false);

        // Both can be true at once, and orphaned files must not be hidden by the failure.
        const warning = filesLeft ? t("videos.delete.filesLeft") : null;
        setActionError([failure, warning].filter(Boolean).join(" ") || null);

        // What the server did decides the list, so read it back rather than guess.
        setReloadToken(token => token + 1);
    }

    if (error) {
        return <p className="shrink-0 text-sm text-destructive">{error}</p>;
    }

    return (
        <>
            <div className="flex shrink-0 items-center gap-2">
                <div className="flex-1">
                    <SidebarSearchInput
                        value={filter}
                        onChange={setFilter}
                        placeholder={t("videos.filterPlaceholder")}
                    />
                </div>
                {actions}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {videos === null ? (
                    <Spinner />
                ) : videos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("videos.noMatch")}</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-9">
                                    <span className="sr-only">{t("videos.columns.expand")}</span>
                                </TableHead>
                                <TableHead>{t("videos.columns.title")}</TableHead>
                                <TableHead>{t("videos.columns.folder")}</TableHead>
                                <TableHead>{t("videos.columns.updatedAt")}</TableHead>
                                <TableHead>{t("videos.columns.revisions")}</TableHead>
                                <TableHead>
                                    <span className="sr-only">{t("videos.columns.actions")}</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {videos.map(video => (
                                <Fragment key={video.id}>
                                    <VideoRow
                                        video={video}
                                        expanded={expanded.has(video.id)}
                                        onToggle={() => toggleExpanded(video.id)}
                                        onDelete={() => askDelete({
                                            videoId: video.id,
                                            title: video.title,
                                            revisions: video.revisions.map(r => r.revision),
                                            whole: true,
                                        })}
                                    />

                                    {expanded.has(video.id) && video.revisions.map(({ revision, uploadedAt }) => (
                                        <RevisionRow
                                            key={revision}
                                            videoId={video.id}
                                            title={video.title}
                                            revision={revision}
                                            uploadedAt={uploadedAt}
                                            onDelete={() => askDelete({
                                                videoId: video.id,
                                                title: video.title,
                                                revisions: [revision],
                                                whole: false,
                                            })}
                                        />
                                    ))}
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {actionError && <p className="shrink-0 text-sm text-destructive">{actionError}</p>}

            {target && (
                <DeleteConfirmDialog
                    target={target}
                    busy={deleting}
                    onConfirm={() => onDelete(target)}
                    onCancel={() => setTarget(null)}
                />
            )}
        </>
    );
}
