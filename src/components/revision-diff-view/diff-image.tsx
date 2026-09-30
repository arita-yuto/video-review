"use client"
import { RefObject, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/ui/label";
import { Switch } from "@/ui/switch";
import { Spinner } from "@/ui/spinner";
import { cn } from "@/lib/utils";
import { usePlayback } from "@/stores/playback-store";
import { useDiffViewStore } from "@/stores/diff-view-store";
import { useDiffImage } from "./use-diff-image";

const THRESHOLD = 24;
const BASE_OPACITY = 0.4;

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

export function DiffImage({ primaryRef, compareRef }: {
    primaryRef: RefObject<HTMLVideoElement | null>,
    compareRef: RefObject<HTMLVideoElement | null>,
}) {
    const t = useTranslations("revision-diff-view");
    const { image, busy } = useDiffImage(primaryRef, compareRef, { threshold: THRESHOLD, baseOpacity: BASE_OPACITY });
    const isPlaying = usePlayback((s) => s.isPlaying);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        // A bitmap handed over once is detached and reports a zero size.
        if (!canvas || !(image instanceof ImageBitmap) || image.width === 0) return;

        // Handing the bitmap over skips a redraw on the page's thread; the canvas needs its size first.
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.getContext("bitmaprenderer")?.transferFromImageBitmap(image);
    }, [image]);

    return (
        <div className="relative flex flex-1 min-h-0 items-center justify-center bg-black rounded">
            {image === "unreadable" ? (
                <p className="text-sm text-muted-foreground">{t("diffUnreadable")}</p>
            ) : image === null ? (
                isPlaying ? <p className="text-sm text-muted-foreground">{t("diffPause")}</p> : <Spinner />
            ) : (
                <>
                    {/* Dimmed while playing or recomputing: it still shows an earlier position. */}
                    <canvas ref={canvasRef} className={cn("max-w-full max-h-full rounded", (isPlaying || busy) && "opacity-50")} />
                    {busy && <Spinner className="absolute" />}
                </>
            )}
        </div>
    );
}
