"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, List, Play } from "lucide-react";
import { Button } from "@/ui/button";
import { ButtonGroup } from "@/ui/button-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { useVideoStore } from "@/stores/video-store";
import { resolveRevisionFilter, type RevisionFilter } from "@/stores/comment-search-store";

export function RevisionFilterRadio({ value, onChange }: {
    value: RevisionFilter;
    onChange: (next: RevisionFilter) => void;
}) {
    const t = useTranslations("video-comment-panel");
    const { selectedVideo, revisions, selectedRevision } = useVideoStore();
    const revisionNumbers = revisions.map((r) => r.revision).sort((a, b) => a - b);
    const [open, setOpen] = useState(false);

    const first = revisionNumbers[0] ?? 1;
    const last = revisionNumbers[revisionNumbers.length - 1] ?? 1;
    const canRange = revisionNumbers.length >= 2;
    const playing = selectedRevision?.revision ?? last;
    const resolved = resolveRevisionFilter(value, selectedVideo?.id);
    const range = resolved.mode === "range" ? resolved : { from: first, to: last };

    const setRange = (from: number, to: number) => {
        if (!selectedVideo) {
            return;
        }
        onChange({ mode: "range", videoId: selectedVideo.id, from, to });
    };

    const variant = (mode: RevisionFilter["mode"]) => resolved.mode === mode ? "accent" : "secondary";

    return (
        <ButtonGroup>
            <Button variant={variant("playing")} size="sm" title={t("revisionPlaying")} onClick={() => onChange({ mode: "playing" })}>
                <Play />
                Rev.{playing}
            </Button>
            <Popover open={open} onOpenChange={(next) => {
                // Opening the picker is already choosing a range; the ends start wide.
                if (next && resolved.mode !== "range") {
                    setRange(first, last);
                }
                setOpen(next);
            }}>
                <PopoverTrigger asChild>
                    <Button variant={variant("range")} size="sm" disabled={!canRange}>
                        <ArrowLeftRight />
                        {resolved.mode === "range" ? `${resolved.from}–${resolved.to}` : t("revisionRange")}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto">
                    {/* Each list stops at the other end, so From stays below To. */}
                    <div className="flex items-center gap-2">
                        <RevisionSelect label={t("revisionFrom")} value={range.from} options={revisionNumbers.filter((n) => n < range.to)} onChange={(v) => setRange(v, range.to)} />
                        <RevisionSelect label={t("revisionTo")} value={range.to} options={revisionNumbers.filter((n) => n > range.from)} onChange={(v) => setRange(range.from, v)} />
                    </div>
                </PopoverContent>
            </Popover>
            <Button variant={variant("all")} size="sm" onClick={() => onChange({ mode: "all" })}>
                <List />
                {t("revisionAll")}
            </Button>
        </ButtonGroup>
    );
}

function RevisionSelect({ label, value, options, onChange }: {
    label: string;
    value: number;
    options: number[];
    onChange: (value: number) => void;
}) {
    return (
        <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
            <SelectTrigger size="sm" aria-label={label}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {options.map((n) => (
                    <SelectItem key={n} value={String(n)}>Rev.{n}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
