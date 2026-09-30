"use client"
import { RefObject, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/ui/label";
import { Switch } from "@/ui/switch";
import { cn } from "@/lib/utils";
import { frameDiff, Rgb } from "@/lib/frame-diff";
import { usePlayback } from "@/stores/playback-store";
import { useDiffViewStore } from "@/stores/diff-view-store";
import { useFramePair } from "./use-frame-pair";

const THRESHOLD = 24;
const BASE_OPACITY = 0.4;

// A colour no other part of the diff-view uses, so it reads only as "changed here".
const HIGHLIGHT_TOKEN = "--chart-2";

// The highlight follows a theme token; a 1px fill turns any CSS colour, oklch included, into RGB.
const tokenRgb = (name: string): Rgb => {
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!ctx) return { r: 255, g: 0, b: 0 };

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name);
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b };
};

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
    const pair = useFramePair(primaryRef, compareRef);
    const isPlaying = usePlayback((s) => s.isPlaying);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !pair || pair === "unreadable") return;

        canvas.width = pair.width;
        canvas.height = pair.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const pixels = frameDiff(pair.primary, pair.compare, {
            threshold: THRESHOLD,
            baseOpacity: BASE_OPACITY,
            highlight: tokenRgb(HIGHLIGHT_TOKEN),
        });
        ctx.putImageData(new ImageData(pixels, pair.width, pair.height), 0, 0);
    }, [pair]);

    return (
        <div className="flex flex-1 min-h-0 items-center justify-center bg-black rounded">
            {pair === "unreadable" ? (
                <p className="text-sm text-muted-foreground">{t("diffUnreadable")}</p>
            ) : pair === null ? (
                <p className="text-sm text-muted-foreground">{isPlaying ? t("diffPause") : t("loading")}</p>
            ) : (
                // Dimmed while playing: it still shows the position playback was paused at.
                <canvas ref={canvasRef} className={cn("max-w-full max-h-full rounded", isPlaying && "opacity-50")} />
            )}
        </div>
    );
}
