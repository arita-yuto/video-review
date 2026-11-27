"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { List } from "lucide-react";
import { api, readError } from "@/api";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Spinner } from "@/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { ActivityKindIcon, type ActivityKind } from "@/components/review/browser/activity/activity-kind-icon";
import { ActivityRow, type ActivityEntry } from "@/components/review/browser/activity/activity-row";

type ActivityFilter = "all" | ActivityKind;

function dayStart(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// Entries arrive newest first, so the entries of one day are adjacent.
function daySections(entries: ActivityEntry[]) {
    const sections: { day: number; entries: ActivityEntry[] }[] = [];

    for (const entry of entries) {
        const day = dayStart(new Date(entry.occurredAt));
        const last = sections.at(-1);

        if (last?.day === day) {
            last.entries.push(entry);
        } else {
            sections.push({ day, entries: [entry] });
        }
    }

    return sections;
}

function NewDivider({ label }: { label: string }) {
    return (
        <div
            data-slot="activity-new-divider"
            className="flex items-center gap-2 text-xs font-bold text-destructive before:h-px before:flex-1 before:bg-current after:h-px after:flex-1 after:bg-current"
        >
            {label}
        </div>
    );
}

export function ActivityDialog({ open, onOpenChange, onSelect }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (entry: ActivityEntry) => void;
}) {
    const FILTERS: ActivityFilter[] = ["all", "comment", "upload", "reaction"];

    const t = useTranslations("activity");
    const format = useFormatter();
    const [request, setRequest] = useState<{ filter: ActivityFilter; before?: string }>({ filter: "all" });
    const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [seenBoundary, setSeenBoundary] = useState<number | null>(null);
    const firstFetchedAt = useRef<string | null>(null);

    const isNew = (entry: ActivityEntry) => seenBoundary !== null && new Date(entry.occurredAt).getTime() > seenBoundary;

    // Entries arrive newest first, so the new ones come before every older one.
    const firstOlderEntry = entries?.some(isNew) ? entries.find((entry) => !isNew(entry)) : undefined;

    const dayHeading = (day: number) => {
        const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

        // Rounded because a day with a daylight saving change is not 24 hours long.
        const daysAgo = Math.round((dayStart(new Date()) - day) / MILLISECONDS_PER_DAY);

        if (daysAgo === 0) {
            return t("today");
        }

        if (daysAgo === 1) {
            return t("yesterday");
        }

        return format.dateTime(new Date(day), { dateStyle: "medium" });
    };

    useEffect(() => {
        if (!open) {
            return;
        }

        return () => {
            const fetchedAt = firstFetchedAt.current;

            firstFetchedAt.current = null;
            setSeenBoundary(null);

            if (fetchedAt === null) {
                return;
            }

            // The dialog is closed, so a failure has no place to be shown.
            void api.activity.seen.$put({ json: { seenAt: fetchedAt } }).catch(() => undefined);
        };
    }, [open]);

    useEffect(() => {
        if (!open) {
            // Returning the same object ends the re-run this effect causes by replacing its own dependency.
            setRequest((current) => (current.filter === "all" && current.before === undefined ? current : { filter: "all" }));
            return;
        }

        const { filter, before } = request;
        let stale = false;
        setError(null);
        setLoadingMore(before !== undefined);

        if (before === undefined) {
            setEntries(null);
            setNextCursor(null);
        }

        void (async () => {
            const res = await api.activity.index.$get({
                query: { ...(filter === "all" ? {} : { kind: filter }), ...(before === undefined ? {} : { before }) },
            });

            if (stale) {
                return;
            }

            setLoadingMore(false);

            if (res.status !== 200) {
                const message = await readError(res);

                if (!stale) {
                    setError(message);
                }

                return;
            }

            const body = await res.json();

            if (stale) {
                return;
            }

            // Only the first response of an open sets the boundary, so entries shown as new stay new until the dialog closes.
            if (firstFetchedAt.current === null) {
                firstFetchedAt.current = body.fetchedAt;
                setSeenBoundary(body.seenAt === null ? null : new Date(body.seenAt).getTime());
            }

            setEntries((current) => (before === undefined ? body.entries : [...(current ?? []), ...body.entries]));
            setNextCursor(body.nextCursor);
        })().catch((reason) => {
            if (!stale) {
                setLoadingMore(false);
                setError(String(reason));
            }
        });

        return () => {
            stale = true;
        };
    }, [open, request]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent size="lg" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                </DialogHeader>

                <Tabs
                    orientation="vertical"
                    value={request.filter}
                    onValueChange={(value) => setRequest({ filter: value as ActivityFilter })}
                    className="min-h-0 flex-1"
                >
                    <TabsList>
                        {FILTERS.map((filter) => (
                            <TabsTrigger key={filter} value={filter}>
                                {filter === "all" ? <List /> : <ActivityKindIcon kind={filter} />}
                                {t(`filters.${filter}`)}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value={request.filter} className="min-h-0 min-w-0 overflow-y-auto">
                        <div data-slot="activity-list" className="flex flex-col gap-2">
                            {entries === null && error === null && <Spinner className="self-center text-primary" />}

                            {entries?.length === 0 && <p className="text-center text-sm text-muted-foreground">{t("empty")}</p>}

                            {entries !== null && daySections(entries).map((section) => (
                                <section key={section.day} className="flex flex-col gap-2">
                                    {section.entries[0] === firstOlderEntry && <NewDivider label={t("newDivider")} />}

                                    <h3 className="text-xs font-medium text-muted-foreground">{dayHeading(section.day)}</h3>

                                    {section.entries.map((entry, index) => (
                                        <Fragment key={`${entry.kind}:${entry.id}`}>
                                            {index > 0 && entry === firstOlderEntry && <NewDivider label={t("newDivider")} />}

                                            <ActivityRow entry={entry} isNew={isNew(entry)} onSelect={onSelect} />
                                        </Fragment>
                                    ))}
                                </section>
                            ))}

                            {error !== null && <p className="text-center text-sm text-destructive">{error}</p>}

                            {loadingMore && <Spinner className="self-center text-primary" />}

                            {nextCursor !== null && !loadingMore && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="self-center"
                                    onClick={() => setRequest({ filter: request.filter, before: nextCursor })}
                                >
                                    {t("loadMore")}
                                </Button>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
