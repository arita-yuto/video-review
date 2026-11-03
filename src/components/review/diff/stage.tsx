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
import { Slider } from "@/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";
import { usePlayback } from "@/components/review/stores/playback-store";
import { DiffViewMode, useDiffViewStore } from "@/components/review/diff/stores/diff-view-store";

export function RevisionSelect({ label, revisions, revision, onChange }: {
    label: string,
    revisions: VideoRevision[],
    revision: VideoRevision,
    onChange: (revision: string) => void,
}) {
    const t = useTranslations("video-title");
    const { locale } = useLocale();

    return (
        <Select value={String(revision.revision)} onValueChange={onChange}>
            <SelectTrigger size="sm" aria-label={label}>
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
                <TabsTrigger value="overlay">{t("overlay")}</TabsTrigger>
            </TabsList>
        </Tabs>
    );
}

export function OverlaySlider() {
    const mode = useDiffViewStore((s) => s.mode);
    const opacity = useDiffViewStore((s) => s.overlayOpacity);
    const setOpacity = useDiffViewStore((s) => s.setOverlayOpacity);
    const leftPercent = Math.round(opacity * 100);

    if (mode !== "overlay") {
        return null;
    }

    return (
        <div className="flex items-center gap-3 px-2">
            <span className="w-10 text-right text-xs tabular-nums text-info">{leftPercent}%</span>
            <Slider
                variant="split"
                min={0}
                max={1}
                step={0.01}
                value={[opacity]}
                onValueChange={(v) => setOpacity(v[0])}
                className="flex-1"
            />
            <span className="w-10 text-xs tabular-nums text-warning">{100 - leftPercent}%</span>
        </div>
    );
}

// All layouts render the same two <video> elements in the same order, so switching modes only restyles them and playback carries on.
export function DiffStage({ left, right, leftRef, rightRef }: {
    left: VideoRevision,
    right: VideoRevision,
    leftRef: Ref<HTMLVideoElement>,
    rightRef: Ref<HTMLVideoElement>,
}) {
    const mode = useDiffViewStore((s) => s.mode);
    const overlayOpacity = useDiffViewStore((s) => s.overlayOpacity);
    const [wipe, setWipe] = useState(0.5);
    const stageRef = useRef<HTMLDivElement>(null);
    const stacked = mode !== "side-by-side";

    const dragTo = (clientX: number) => {
        const rect = stageRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0) return;
        setWipe(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)));
    };

    return (
        <div
            ref={stageRef}
            className={cn("relative flex-1 grid gap-3 min-h-0", stacked ? "grid-cols-1" : "grid-cols-2")}
            style={{ "--wipe-x": `${wipe * 100}%`, "--overlay-opacity": overlayOpacity } as React.CSSProperties}
        >
            <DiffVideo
                revision={left}
                videoRef={leftRef}
                className={cn(
                    stacked && "col-start-1 row-start-1 z-10",
                    mode === "wipe" && "wipe-clip",
                    // On the left revision, so the slider's right end shows it fully like the wipe handle does.
                    // Its black letterbox must not dim the right revision, so the wrapper goes transparent too.
                    mode === "overlay" && "opacity-(--overlay-opacity) bg-transparent",
                )}
            />
            <DiffVideo revision={right} videoRef={rightRef} className={cn(stacked && "col-start-1 row-start-1")} />
            {mode === "wipe" && (
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
    const togglePlay = usePlayback((s) => s.togglePlay);
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
