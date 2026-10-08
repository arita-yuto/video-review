"use client";
import React, { useState } from "react";
import { Button } from "@/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPause, faPlay, faVolumeHigh, faVolumeXmark } from "@fortawesome/free-solid-svg-icons";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/ui/select";
import { Slider } from "@/ui/slider";
import { ButtonGroup } from "@/ui/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";
import { ArrowRightToLine, ListVideo, Repeat1, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatTime } from "@/lib/utils";
import { usePlayback } from "@/stores/playback-store";
import { EPlayMode, useVideoPlayerStore } from "@/stores/video-player-store";

export function PlayButton() {
    const isPlaying = usePlayback((s) => s.isPlaying);
    const togglePlay = usePlayback((s) => s.togglePlay);

    return (
        <Button variant="ghost" size="icon-round" onClick={togglePlay}>
            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
        </Button>
    );
}

export function VolumeControl() {
    const [showSlider, setShowSlider] = useState(false);
    const volume = useVideoPlayerStore((s) => s.volume);
    const volumeEnabled = useVideoPlayerStore((s) => s.volumeEnabled);
    const setVolume = useVideoPlayerStore((s) => s.setVolume);
    const setVolumeEnabled = useVideoPlayerStore((s) => s.setVolumeEnabled);

    return (
        <div className="ml-2 flex items-center gap-2" onMouseOver={() => setShowSlider(true)} onMouseLeave={() => setShowSlider(false)}>
            <Button variant="ghost" size="icon-round" onClick={() => setVolumeEnabled(!volumeEnabled)}>
                {volumeEnabled ? (
                    <FontAwesomeIcon icon={faVolumeHigh} />
                ) : (
                    <FontAwesomeIcon icon={faVolumeXmark} />
                )}
            </Button>
            <span hidden={!showSlider} className="w-25">
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
    );
}

export function TimeDisplay() {
    const currentTime = usePlayback((s) => s.currentTime);
    const duration = usePlayback((s) => s.duration);

    return (
        <span className="ml-2 flex items-center gap-2 text-sm text-muted-foreground w-30">
            {formatTime(currentTime)} / {formatTime(duration)}
        </span>
    );
}

export function PlaybackRateSelect() {
    const playbackRate = useVideoPlayerStore((s) => s.playbackRate);
    const setPlaybackRate = useVideoPlayerStore((s) => s.setPlaybackRate);

    return (
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
    );
}

const PLAY_MODES: { mode: EPlayMode; Icon: LucideIcon }[] = [
    { mode: "normal", Icon: ArrowRightToLine },
    { mode: "loop", Icon: Repeat1 },
    { mode: "next", Icon: ListVideo },
];

export function PlayModeButtons() {
    const t = useTranslations("video-control-panel");
    const playMode = useVideoPlayerStore((s) => s.playMode);
    const setMode = useVideoPlayerStore((s) => s.setMode);

    return (
        <ButtonGroup aria-label={t("playMode")}>
            {PLAY_MODES.map(({ mode, Icon }) => (
                <Tooltip key={mode}>
                    <TooltipTrigger asChild>
                        <Button
                            variant={playMode === mode ? "accent" : "ghost"}
                            size="icon-sm"
                            aria-label={t(mode)}
                            aria-pressed={playMode === mode}
                            onClick={() => setMode(mode)}
                        >
                            <Icon />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t(mode)}</TooltipContent>
                </Tooltip>
            ))}
        </ButtonGroup>
    );
}
