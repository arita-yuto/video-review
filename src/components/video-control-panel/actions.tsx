"use client";
import React, { useState } from "react";
import { Button } from "@/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink, faDownload, faGamepad, faCamera, faPalette } from "@fortawesome/free-solid-svg-icons";
import { Switch } from "@/ui/switch";
import { ButtonGroup, ButtonGroupText } from "@/ui/button-group";
import { useTranslations } from "next-intl";
import { formatTime } from "@/lib/utils";
import { createOpenSceneLink } from "@/lib/url";
import { useConfigStore } from "@/stores/config-store";
import { useDrawingSettingsStore } from "@/stores/drawing-settings-store";
import { captureView } from "@/lib/drawing/capture-view";
import { ShareLinkDialog } from "@/components/dialog/share-link";
import { VideoDownloadDialog } from "@/components/dialog/video-download";

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
    const [open, setOpen] = useState(false);
    if (!videoId || !videoRevId) {
        return <></>
    }

    return (
        <>
            <Button size="icon-sm" onClick={() => setOpen(true)}>
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
