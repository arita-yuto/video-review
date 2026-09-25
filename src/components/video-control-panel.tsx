"use client";
import React, { useState } from "react";
import { Button } from "@/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPause,
    faPlay,
    faLink,
    faDownload,
    faGamepad,
    faVolumeHigh,
    faVolumeXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/ui/select";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { formatTime } from "@/lib/utils";
import { createOpenSceneLink, createVideoTimeLink } from "@/lib/url";
import { useConfigStore } from "@/stores/config-store";
import { EPlayMode, useVideoPlayerStore } from "@/stores/video-player-store";
import { useVideoStore } from "@/stores/video-store";
import { useTranslations } from "next-intl";
import { Slider } from "@/ui/slider";
import { ShareLinkDialog } from "@/components/dialog/share-link";
import { VideoDownloadDialog } from "@/components/dialog/video-download";

export default function VideoControlPanel() {
    const t = useTranslations("video-control-panel");

    const [showVolume, setShowVolume] = useState(false);
    const [showPlayMode, setShowPlayMode] = useState(false);
    const { currentTime, duration } = useVideoReviewStore();

    const {
        isPlaying,
        playMode,
        volume,
        volumeEnabled,
        setVolume,
        setVolumeEnabled,
        setMode,
        togglePlay,
        playbackRate,
        setPlaybackRate,
    } = useVideoPlayerStore();

    const { selectedVideo, selectedRevision } = useVideoStore();

    const createLink = (): string => {
        if (!selectedVideo) {
            return "";
        }

        if (selectedRevision === null) {
            return "";
        }
        return createVideoTimeLink(window.location.origin, selectedVideo?.id, currentTime) ?? "";
    };

    return (
        <div onMouseLeave={() => { setShowVolume(false); setShowPlayMode(false); }} className="flex items-center gap-3 mb-3 bg-card rounded-lg px-3 py-2 border">
            <Button variant="ghost" size="icon-round" onClick={togglePlay}>
                <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
            </Button>

            <div className="ml-2 flex items-center gap-2" onMouseOver={() => setShowVolume(true)}>
                <Button variant="ghost" size="icon-round" onClick={() => setVolumeEnabled(!volumeEnabled)}>
                    {volumeEnabled ? (
                        <FontAwesomeIcon icon={faVolumeHigh} />
                    ) : (
                        <FontAwesomeIcon icon={faVolumeXmark} />
                    )}
                </Button>
                <span hidden={!showVolume} className="w-25">
                    <Slider
                        min={0}
                        max={1.0}
                        step={0.01}
                        value={[volume]}
                        onValueChange={(v) => {
                            setVolume(v[0]);
                        }}
                        onValueCommit={(v) => {
                            setVolume(v[0]);
                        }}
                        className="w-full"
                    />
                </span>
            </div>

            <span className="ml-2 flex items-center gap-2 text-sm text-muted-foreground w-30">
                {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <Select
                value={playbackRate.toString()}
                onValueChange={(val) => {
                    const rate = parseFloat(val);
                    setPlaybackRate(rate);
                }}
            >
                <SelectTrigger size="sm" className="w-20">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4].map((r) => (
                        <SelectItem key={r} value={r.toString()}>
                            {r}x
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="flex items-center gap-2" onMouseOver={() => setShowPlayMode(true)}>
                <span className="text-xs text-white">
                    {t("playMode")} : {t(playMode)}
                </span>

                <div
                    className={`transition-opacity ${showPlayMode
                            ? "opacity-100 pointer-events-auto"
                            : "opacity-0 pointer-events-none"}`}>
                    <Select
                        value={playMode}
                        onValueChange={(val) => {
                            setMode(val as EPlayMode);
                        }}
                    >
                        <SelectTrigger size="sm" className="relative w-30">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {["normal", "loop", "next"].map((r) => (
                                <SelectItem key={r} value={r.toString()}>
                                    {t(r)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="ml-auto flex gap-1">
                <OpenSceneButton scenePath={selectedVideo?.scenePath ?? null} />
                <DownloadVideo videoId={selectedVideo?.id ?? null} videoRevId={selectedRevision?.id ?? null} />
                <ButtonShareLink url={createLink()} />
            </div>
        </div>
    );
}

function ButtonShareLink({ url }: { url: string }) {
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

function DownloadVideo({ videoId, videoRevId }: { videoId: string | null, videoRevId: string | null }) {
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

function OpenSceneButton({ scenePath }: { scenePath: string | null }) {
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
