import type { ReactNode } from "react";
import { cn, formatDateTime } from "@/lib/utils";
import type { Relevance, VcsCommit, VcsPullRequest } from "@/lib/vcs-types";
import { Badge } from "@/ui/badge";
import { useLocale } from "@/app/locale-provider";

// One pull request or commit. The left edge marks relevance to the video's watched paths.
function ChangeCard({ id, title, url, author, date, relevance, children }: {
    /** PR number or short hash, shown in monospace before the title. */
    id: string;
    title: string;
    url?: string | null;
    author: string;
    date: Date | string;
    relevance: Relevance;
    children?: ReactNode;
}) {
    const { locale } = useLocale();

    return (
        <div
            className={cn(
                "bg-card border rounded px-3 py-2 flex flex-col gap-1 min-w-0",
                relevance === "high" && "border-l-2 border-l-primary",
                relevance === "maybe" && "border-l-2 border-l-muted-foreground",
                relevance === "unlikely" && "opacity-60",
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="text-sm truncate flex-1 min-w-0" title={title}>
                    <span className="text-primary font-mono text-xs mr-1">{id}</span>
                    {title}
                </span>
                {url && (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary text-xs shrink-0">
                        ↗
                    </a>
                )}
            </div>
            <div className="text-xs text-muted-foreground">
                @{author} · {formatDateTime(date, locale)}
            </div>
            {children}
        </div>
    );
}

const MAX_LABELS = 5;

export function PrCard({ pr }: { pr: VcsPullRequest }) {
    const visibleLabels = pr.labels.slice(0, MAX_LABELS);
    const hiddenCount = pr.labels.length - MAX_LABELS;

    return (
        <ChangeCard id={`#${pr.id}`} title={pr.title} url={pr.url} author={pr.author} date={pr.mergedAt} relevance={pr.relevance}>
            {pr.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                    {visibleLabels.map((label) => (
                        <Badge key={label} variant="secondary">{label}</Badge>
                    ))}
                    {hiddenCount > 0 && (
                        <span className="text-muted-foreground text-xs leading-5">+{hiddenCount}</span>
                    )}
                </div>
            )}
        </ChangeCard>
    );
}

export function CommitCard({ commit }: { commit: VcsCommit }) {
    return (
        <ChangeCard id={commit.shortHash} title={commit.message} url={commit.url} author={commit.author} date={commit.committedAt} relevance={commit.relevance} />
    );
}
