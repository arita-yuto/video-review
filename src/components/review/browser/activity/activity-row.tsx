import { useFormatter } from "next-intl";
import type { InferResponseType } from "hono/client";
import type { api } from "@/api";
import { cn } from "@/lib/utils";
import { AccountAvatar } from "@/components/controls/account-avatar";
import { ActivityKindIcon } from "@/components/review/browser/activity/activity-kind-icon";
import { NewBadge } from "@/components/review/browser/marks/parts/new-mark";
import { TimeBadge } from "@/components/review/side-panel/time-badge";
import { TimelineCard, TimelineCardContent, TimelineCardHeader } from "@/components/review/side-panel/timeline-card";

export type ActivityEntry = InferResponseType<typeof api.activity.index.$get, 200>["entries"][number];

export function ActivityRow({ entry, isNew, onSelect }: {
    entry: ActivityEntry;
    isNew: boolean;
    onSelect: (entry: ActivityEntry) => void;
}) {
    const format = useFormatter();

    return (
        <TimelineCard data-slot="activity-row" state={isNew ? "new" : "none"} onClick={() => onSelect(entry)}>
            <TimelineCardHeader>
                <div className="flex min-w-0 items-center gap-2 text-sm">
                    <ActivityKindIcon kind={entry.kind} />

                    {entry.kind !== "upload" && (
                        <>
                            <AccountAvatar email={entry.userEmail} className="size-5" />
                            <span className="shrink-0 font-medium">{entry.userName}</span>
                        </>
                    )}

                    <span className="truncate text-foreground">{entry.video.title}</span>

                    {entry.kind === "comment" && <TimeBadge seconds={entry.time} muted />}

                    {entry.kind === "upload" && <span className="shrink-0 text-xs text-muted-foreground">Rev.{entry.revision}</span>}
                </div>

                <span className="ml-2 flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    {isNew && <NewBadge />}

                    {format.relativeTime(new Date(entry.occurredAt), new Date())}
                </span>
            </TimelineCardHeader>

            {entry.kind !== "upload" && (
                <TimelineCardContent>
                    <p className={cn("line-clamp-2 text-sm break-all", entry.kind === "reaction" && "text-muted-foreground")}>
                        {entry.text}
                    </p>
                </TimelineCardContent>
            )}
        </TimelineCard>
    );
}
