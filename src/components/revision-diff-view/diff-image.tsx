"use client"
import { RefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/ui/button";
import { Label } from "@/ui/label";
import { Slider } from "@/ui/slider";
import { Switch } from "@/ui/switch";
import { Spinner } from "@/ui/spinner";
import { cn, formatTime } from "@/lib/utils";
import { isGuest } from "@/lib/role";
import { useAuthStore } from "@/stores/auth-store";
import { usePlayback, usePlaybackStoreApi } from "@/stores/playback-store";
import { useDiffViewStore } from "@/stores/diff-view-store";
import { useDiffImage } from "./use-diff-image";

export function DiffImageSwitch() {
    const t = useTranslations("revision-diff-view");
    const show = useDiffViewStore((s) => s.showDiffImage);
    const setShow = useDiffViewStore((s) => s.setShowDiffImage);

    return (
        <Label>
            <Switch checked={show} onCheckedChange={setShow} />
            {t("diffImage")}
        </Label>
    );
}

// The controls are portalled into the player's control row so the canvas and state stay local.
export function DiffImage({ primaryRef, compareRef, controlsSlot, fileName }: {
    primaryRef: RefObject<HTMLVideoElement | null>,
    compareRef: RefObject<HTMLVideoElement | null>,
    controlsSlot: HTMLElement | null,
    fileName: string,
}) {
    const t = useTranslations("revision-diff-view");
    const threshold = useDiffViewStore((s) => s.diffThreshold);
    const baseOpacity = useDiffViewStore((s) => s.diffBaseOpacity);
    const state = useDiffImage(primaryRef, compareRef, { threshold, baseOpacity });
    const image = state.status === "ready" ? state.image : state.status === "computing" ? state.previous : null;
    const computing = state.status === "computing";
    const isPlaying = usePlayback((s) => s.isPlaying);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        // A bitmap handed over once is detached and reports a zero size.
        if (!canvas || !image || image.width === 0) return;

        // Handing the bitmap over skips a redraw on the page's thread; the canvas needs its size first.
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.getContext("bitmaprenderer")?.transferFromImageBitmap(image);
    }, [image]);

    return (
        <div className="relative flex flex-1 min-h-0 items-center justify-center bg-black rounded">
            {state.status === "unreadable" ? (
                <p className="text-sm text-muted-foreground">{t("diffUnreadable")}</p>
            ) : image === null ? (
                isPlaying ? <p className="text-sm text-muted-foreground">{t("diffPause")}</p> : <Spinner />
            ) : (
                <>
                    {/* Dimmed while playing or recomputing: it still shows an earlier position. */}
                    <canvas ref={canvasRef} className={cn("max-w-full max-h-full rounded", (isPlaying || computing) && "opacity-50")} />
                    {computing && <Spinner className="absolute" />}
                </>
            )}
            {controlsSlot && createPortal(
                <DiffImageControls canvasRef={canvasRef} saveable={state.status === "ready" && !isPlaying} fileName={fileName} />,
                controlsSlot,
            )}
        </div>
    );
}

function DiffImageControls({ canvasRef, saveable, fileName }: {
    canvasRef: RefObject<HTMLCanvasElement | null>,
    // Only a diff of the position on screen is worth saving.
    saveable: boolean,
    fileName: string,
}) {
    const t = useTranslations("revision-diff-view");
    const role = useAuthStore((s) => s.role);
    const playback = usePlaybackStoreApi();
    const diffThreshold = useDiffViewStore((s) => s.diffThreshold);
    const diffBaseOpacity = useDiffViewStore((s) => s.diffBaseOpacity);
    const setDiffThreshold = useDiffViewStore((s) => s.setDiffThreshold);
    const setDiffBaseOpacity = useDiffViewStore((s) => s.setDiffBaseOpacity);

    const save = () => canvasRef.current?.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        // mm-ss: a colon is not allowed in file names on Windows.
        link.download = `${fileName}_${formatTime(playback.getState().currentTime).replaceAll(":", "-")}_diff.png`;
        link.click();
        URL.revokeObjectURL(url);
    });

    return (
        <>
            <SettingSlider label={t("threshold")} value={diffThreshold} min={1} max={100} step={1} onCommit={setDiffThreshold} />
            <SettingSlider label={t("base")} value={diffBaseOpacity} min={0} max={1} step={0.05} onCommit={setDiffBaseOpacity} />
            {/* Guests watch only; saving images would take the footage out. */}
            {!isGuest(role) && (
                <Button size="icon-sm" aria-label={t("saveDiffImage")} disabled={!saveable} onClick={save}>
                    <FontAwesomeIcon icon={faCamera} />
                </Button>
            )}
        </>
    );
}

// Each commit redoes the diff, so the stored value only changes when the thumb is released.
function SettingSlider({ label, value, min, max, step, onCommit }: {
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onCommit: (value: number) => void,
}) {
    const [dragging, setDragging] = useState<number | null>(null);

    return (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
            {label}
            <Slider
                min={min}
                max={max}
                step={step}
                value={[dragging ?? value]}
                onValueChange={(v) => setDragging(v[0])}
                onValueCommit={(v) => {
                    setDragging(null);
                    onCommit(v[0]);
                }}
                className="w-24"
            />
        </label>
    );
}
