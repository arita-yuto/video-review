"use client"
import { Ref, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLeftRight } from "@fortawesome/free-solid-svg-icons";
import { VideoRevision } from "@/lib/db-types";
import { resolveMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import { useLocale } from "@/app/locale-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { useVideoPlayerStore } from "@/stores/video-player-store";
import { DiffViewMode, useDiffViewStore } from "@/stores/diff-view-store";

export function RevisionSelect({ revisions, revision, onChange }: {
    revisions: VideoRevision[],
    revision: VideoRevision,
    onChange: (revision: string) => void,
}) {
    const t = useTranslations("video-title");
    const { locale } = useLocale();

    return (
        <Select value={String(revision.revision)} onValueChange={onChange}>
            <SelectTrigger size="sm">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {revisions.map((r) => (
                    <SelectItem key={r.id} value={String(r.revision)}>
                        {t("revisionOption", {
                            revision: r.revision,
                            date: new Date(r.uploadedAt).toLocaleDateString(locale)
                        })}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export function ModeTabs() {
    const t = useTranslations("revision-diff-view");
    const mode = useDiffViewStore((s) => s.mode);
    const setMode = useDiffViewStore((s) => s.setMode);

    return (
        <Tabs value={mode} onValueChange={(v) => setMode(v as DiffViewMode)}>
            <TabsList>
                <TabsTrigger value="side-by-side">{t("sideBySide")}</TabsTrigger>
                <TabsTrigger value="wipe">{t("wipe")}</TabsTrigger>
            </TabsList>
        </Tabs>
    );
}

// Both layouts render the same two <video> elements in the same order, so switching modes
// only restyles them and playback carries on without reloading.
export function DiffStage({ left, right, leftRef, rightRef }: {
    left: VideoRevision,
    right: VideoRevision,
    leftRef: Ref<HTMLVideoElement>,
    rightRef: Ref<HTMLVideoElement>,
}) {
    const mode = useDiffViewStore((s) => s.mode);
    const [wipe, setWipe] = useState(0.5);
    const stageRef = useRef<HTMLDivElement>(null);
    const wiping = mode === "wipe";

    const dragTo = (clientX: number) => {
        const rect = stageRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0) return;
        setWipe(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)));
    };

    return (
        <div
            ref={stageRef}
            className={cn("relative flex-1 grid gap-3 min-h-0", wiping ? "grid-cols-1" : "grid-cols-2")}
            style={{ "--wipe-x": `${wipe * 100}%` } as React.CSSProperties}
        >
            <DiffVideo revision={left} videoRef={leftRef} className={cn(wiping && "col-start-1 row-start-1 z-10 wipe-clip")} />
            <DiffVideo revision={right} videoRef={rightRef} className={cn(wiping && "col-start-1 row-start-1")} />
            {wiping && (
                <div
                    className="absolute inset-y-0 left-(--wipe-x) z-20 w-1 -translate-x-1/2 bg-foreground cursor-ew-resize touch-none select-none"
                    onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dragTo(e.clientX); }}
                    onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) dragTo(e.clientX); }}
                >
                    <span className="absolute top-1/2 left-1/2 -translate-1/2 flex size-8 items-center justify-center rounded-full bg-foreground text-background">
                        <FontAwesomeIcon icon={faLeftRight} />
                    </span>
                </div>
            )}
        </div>
    );
}

function DiffVideo({ revision, videoRef, className }: {
    revision: VideoRevision,
    videoRef: Ref<HTMLVideoElement>,
    className?: string,
}) {
    const togglePlay = useVideoPlayerStore((s) => s.togglePlay);
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        let canceled = false;
        void (async () => {
            const resolved = await resolveMediaUrl(revision.filePath);
            if (!canceled) setUrl(resolved ?? null);
        })();
        return () => { canceled = true; };
    }, [revision.filePath]);

    return (
        <div className={cn("flex items-center justify-center bg-black rounded min-h-0 min-w-0", className)}>
            <video
                ref={videoRef}
                src={url ?? undefined}
                onClick={togglePlay}
                className="w-full h-full rounded cursor-pointer object-contain"
            />
        </div>
    );
}
