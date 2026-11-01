"use client";

import { RefObject, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/ui/button";
import { useVideoStore } from "@/components/stores/video-store";
import { useVcsChangesStore } from "@/components/review/side-panel/vcs-panel/stores/vcs-changes-store";
import { CommitCard, PrCard } from "@/components/review/side-panel/vcs-panel/change-card";
import type { VcsCommit, VcsPullRequest } from "@/lib/vcs-types";

function diffDays(from: Date | null, to: Date): number {
    if (!from) return 0;
    return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function SectionHeader({ label, high, maybe }: { label: string; high: number; maybe: number }) {
    return (
        <div className="text-xs text-muted-foreground pt-3 pb-1 flex items-center gap-1">
            <span className="font-semibold">{label}</span>
            <span>（high: {high} / maybe: {maybe}）</span>
        </div>
    );
}

function partition<T extends { relevance: string }>(items: T[]) {
    return {
        high: items.filter((x) => x.relevance === "high"),
        maybe: items.filter((x) => x.relevance === "maybe"),
        unlikely: items.filter((x) => x.relevance === "unlikely"),
    };
}

export default function VcsChangesContent(props: {
    topAreaRef: RefObject<HTMLDivElement | null>;
}) {
    void props.topAreaRef;
    const t = useTranslations("vcs-changes-panel");
    const { selectedVideo, revisions, selectedRevision } = useVideoStore();
    const { data, loading, error, summary, summaryLoading, fetchChanges, fetchSummary, clear } = useVcsChangesStore();
    const [showUnlikely, setShowUnlikely] = useState(false);

    const handleRefresh = () => {
        if (!selectedVideo) return;
        setShowUnlikely(false);
        void fetchChanges(selectedVideo.id, prevRevision, selectedRevision, true);
    };

    const prevRevision = useMemo(() => {
        if (!selectedRevision) return null;
        return (
            revisions
                .filter((r) => r.revision < selectedRevision.revision && !r.deleted)
                .sort((a, b) => b.revision - a.revision)[0] ?? null
        );
    }, [revisions, selectedRevision]);

    useEffect(() => {
        if(!prevRevision || !selectedRevision) {
            return;
        }
        if (!selectedVideo) {
            clear();
            return;
        }
        void fetchChanges(selectedVideo.id, prevRevision, selectedRevision);
    }, [selectedVideo?.id, prevRevision?.id]);

    /*
     * Summary is fetched independently after vcs-changes loads.
     * 503 (LLM not configured) and 404 (no cache) both resolve to null silently.
     */
    useEffect(() => {
        if (!selectedVideo || !data) return;
        void fetchSummary(selectedVideo.id, selectedRevision);
    }, [selectedVideo?.id, data, selectedRevision]);

    const prs = useMemo<ReturnType<typeof partition<VcsPullRequest>>>(
        () => partition(data?.pullRequests ?? []),
        [data],
    );
    const commits = useMemo<ReturnType<typeof partition<VcsCommit>>>(
        () => partition(data?.commits ?? []),
        [data],
    );

    const unlikelyCount = prs.unlikely.length + commits.unlikely.length;

    /*
     * When vcsWatchPaths is empty, all items score "high" by design.
     * In that case the unlikely toggle is not meaningful, so we hide it.
     */
    const allHigh =
        data != null &&
        prs.maybe.length === 0 &&
        prs.unlikely.length === 0 &&
        commits.maybe.length === 0 &&
        commits.unlikely.length === 0;

    const toDate = data?.range.to ? new Date(data.range.to) : (selectedRevision ? new Date(selectedRevision.uploadedAt) : null);
    const fromDate = data?.range.from ? new Date(data.range.from) : null;
    const days = toDate ? diffDays(fromDate, toDate) : null;

    return (
        <div className="bg-sidebar w-full h-full flex flex-col border-r overflow-y-auto overflow-x-hidden">
            <div className="px-3 pt-3 pb-2 border-b">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        {selectedRevision && prevRevision && (
                            <div className="text-xs text-muted-foreground mb-1">
                                rev {prevRevision.revision} → rev {selectedRevision.revision}
                                {days != null && days > 0 && <span className="ml-1">（{days}{t("unit-days")}）</span>}
                            </div>
                        )}
                        {data && (
                            <div className="text-xs text-muted-foreground">
                                PR {data.pullRequests.length}{t("unit-items")} / {t("commits")} {data.commits.length}{t("unit-items")}
                            </div>
                        )}
                    </div>
                    {(data || error) && !loading && (
                        <Button variant="ghost" size="icon-sm" onClick={handleRefresh} title={t("refresh")} className="shrink-0">
                            <RefreshCw />
                        </Button>
                    )}
                </div>
                {(summary || summaryLoading) && (
                    <div className="mt-2 text-xs text-foreground/80 leading-relaxed">
                        <span className="text-primary mr-1">[AI]</span>
                        {summaryLoading ? <span className="text-muted-foreground">{t("summary-loading")}</span> : summary}
                    </div>
                )}
                {!loading && !data && !error && (
                    <div className="text-xs text-muted-foreground">{t("no-revision")}</div>
                )}
            </div>

            <div className="flex-1 px-3 pb-4">
                {loading && (
                    <div className="flex items-center gap-2 pt-4">
                        <Loader2 className="animate-spin size-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{t("loading")}</span>
                    </div>
                )}

                {error && (
                    <div className="text-xs text-muted-foreground pt-4">
                        {error.includes("not configured") ? t("not-configured") : `${t("error")}: ${error}`}
                    </div>
                )}

                {!loading && !error && data && (
                    <>
                        {unlikelyCount > 0 && !allHigh && (
                            <Button variant="inline" size="xs" className="mt-3" onClick={() => setShowUnlikely((v) => !v)}>
                                {showUnlikely
                                    ? t("hide-unlikely")
                                    : `${t("show-unlikely")} (${unlikelyCount}${t("unit-items")})`}
                            </Button>
                        )}

                        {(prs.high.length > 0 || prs.maybe.length > 0 || (showUnlikely && prs.unlikely.length > 0)) && (
                            <div>
                                <SectionHeader label={t("section-prs")} high={prs.high.length} maybe={prs.maybe.length} />
                                <div className="flex flex-col gap-2">
                                    {[...prs.high, ...prs.maybe].map((pr) => (
                                        <PrCard key={pr.id} pr={pr} />
                                    ))}
                                    {showUnlikely && prs.unlikely.map((pr) => (
                                        <PrCard key={pr.id} pr={pr} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {(commits.high.length > 0 || commits.maybe.length > 0 || (showUnlikely && commits.unlikely.length > 0)) && (
                            <div>
                                <SectionHeader label={t("section-commits")} high={commits.high.length} maybe={commits.maybe.length} />
                                <div className="flex flex-col gap-2">
                                    {[...commits.high, ...commits.maybe].map((commit) => (
                                        <CommitCard key={commit.hash} commit={commit} />
                                    ))}
                                    {showUnlikely && commits.unlikely.map((commit) => (
                                        <CommitCard key={commit.hash} commit={commit} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {data.pullRequests.length === 0 && data.commits.length === 0 && (
                            <div className="text-xs text-muted-foreground pt-4">{t("empty")}</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
