"use client";
import React, { useState } from "react";
import { Button } from "@/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink, faDownload, faGamepad, faCamera, faPalette, faExpand, faCompress } from "@fortawesome/free-solid-svg-icons";
import { Switch } from "@/ui/switch";
import { ButtonGroup, ButtonGroupText } from "@/ui/button-group";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { formatTime } from "@/lib/utils";
import { createOpenSceneLink } from "@/lib/url";
import { useConfigStore } from "@/stores/config-store";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { useDrawingSettingsStore } from "@/stores/drawing-settings-store";
import { captureView } from "@/lib/drawing/capture-view";
import { ShareLinkDialog } from "@/components/controls/share-link";
import { VideoDownloadDialog } from "@/components/review/player/control-panel/video-download";

export function ScreenshotButton({ title, time }: { title: string | null, time: number }) {
    const t = useTranslations("video-control-panel");
    const captureDrawing = useDrawingSettingsStore((s) => s.captureDrawing);
    const setCaptureDrawing = useDrawingSettingsStore((s) => s.setCaptureDrawing);
    if (title === null) {
        return <></>
    }

    const save = async () => {
        const blob = await captureView();
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        // mm-ss: a colon is not allowed in file names on Windows.
        link.download = `${title}_${formatTime(time).replaceAll(":", "-")}.png`;
        link.click();
        URL.revokeObjectURL(url);
        // In fullscreen the browser's own download indicator is out of sight.
        toast.success(t("screenshotSaved"), { description: link.download });
    };

    return (
        <ButtonGroup>
            {/* Part of the label, so clicking the palette toggles the switch too. */}
            <ButtonGroupText asChild>
                <label htmlFor="capture-drawing">
                    <FontAwesomeIcon icon={faPalette} className={captureDrawing ? "text-primary" : "text-muted-foreground"} />
                    <Switch id="capture-drawing" checked={captureDrawing} onCheckedChange={setCaptureDrawing} aria-label={t("captureDrawing")} />
                </label>
            </ButtonGroupText>
            <Button size="icon-sm" aria-label={t("saveScreenshot")} onClick={save}>
                <FontAwesomeIcon icon={faCamera} />
            </Button>
        </ButtonGroup>
    );
}

export function ShareLinkButton({ url }: { url: string }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button size="icon-sm" onClick={() => setOpen(true)}>
                <FontAwesomeIcon icon={faLink} />
            </Button>
            <ShareLinkDialog url={url} open={open} onOpenChange={setOpen} />
        </>
    );
}

export function DownloadButton({ videoId, videoRevId }: { videoId: string | null, videoRevId: string | null }) {
    const t = useTranslations("video-control-panel");
    const [open, setOpen] = useState(false);

    if (!videoId || !videoRevId) {
        return <></>
    }

    return (
        <>
            <Button size="icon-sm" aria-label={t("downloadVideo")} title={t("downloadVideo")} onClick={() => setOpen(true)}>
                <FontAwesomeIcon icon={faDownload} />
            </Button>
            <VideoDownloadDialog videoId={videoId} videoRevId={videoRevId} open={open} onClose={() => setOpen(false)} />
        </>
    );
}

export function OpenSceneButton({ scenePath }: { scenePath: string | null }) {
    const urlSchema = useConfigStore(s => s.urlSchema);
    const link = scenePath ? createOpenSceneLink(urlSchema, scenePath) : null;
    if (!link) {
        return <></>
    }

    return (
        <Button size="icon-sm" onClick={() => { window.location.href = link; }}>
            <FontAwesomeIcon icon={faGamepad} />
        </Button>
    );
}

export function FullscreenButton() {
    const t = useTranslations("video-control-panel");
    const fullscreen = useVideoReviewStore((s) => s.fullscreen);
    const toggleFullscreen = useVideoReviewStore((s) => s.toggleFullscreen);
    const label = fullscreen ? t("exitFullscreen") : t("fullscreen");

    return (
        <Button size="icon-sm" aria-label={label} title={label} onClick={toggleFullscreen}>
            <FontAwesomeIcon icon={fullscreen ? faCompress : faExpand} />
        </Button>
    );
}
