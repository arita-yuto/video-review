"use client";
import React, { useState, type ReactNode } from "react";
import { Button } from "@/ui/button";
import { Toggle } from "@/ui/toggle";
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
import { PopoverContent, PopoverTrigger } from "@/ui/popover";
import { ControlRow } from "@/components/controls/control-row";
import { Separator } from "@/ui/separator";
import { ArrowRightToLine, ListVideo, Pin, Presentation, Repeat1, Settings, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatTime } from "@/lib/utils";
import { usePlayback } from "@/stores/playback-store";
import { joinSync, leaveSync, putPresenter, useJoining, usePresenterLock, useSyncing } from "@/lib/sync-session";
import { createVideoJoinLink } from "@/lib/url";
import { useRouter } from "next/navigation";
import { ShareLinkDialog } from "@/components/dialog/share-link";
import { PresenterRequestDialog } from "@/components/dialog/presenter-request-dialog";
import { SyncJoinDialog } from "@/components/dialog/sync-join-dialog";
import { Spinner } from "@/ui/spinner";
import { EPlayMode, useVideoPlayerStore, type PlaybackSettingId } from "@/stores/video-player-store";
import { useConfigStore } from "@/stores/config-store";
import { usePlaybackWidth } from "@/lib/hooks/use-playback-width";
import { AccountAvatar } from "@/components/controls/account-avatar";

export function PlayButton() {
    const t = useTranslations("video-control-panel");
    const isPlaying = usePlayback((s) => s.isPlaying);
    const togglePlay = usePlayback((s) => s.togglePlay);
    const locked = usePresenterLock();

    return (
        <Button variant="ghost" size="icon-round" aria-label={isPlaying ? t("pause") : t("play")} disabled={locked} onClick={togglePlay}>
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
        <span className="ml-2 flex shrink-0 items-center gap-2 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
        </span>
    );
}

export function PlaybackRateSelect() {
    const t = useTranslations("video-control-panel");
    const playbackRate = useVideoPlayerStore((s) => s.playbackRate);
    const setPlaybackRate = useVideoPlayerStore((s) => s.setPlaybackRate);
    const locked = usePresenterLock();

    return (
        <Select
            value={playbackRate.toString()}
            disabled={locked}
            onValueChange={(val) => {
                const rate = parseFloat(val);
                setPlaybackRate(rate);
            }}
        >
            <SelectTrigger size="sm" className="w-20" aria-label={t("playbackRate")} title={t("playbackRate")}>
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

export function PlaybackResolutionSelect() {
    const ORIGINAL = "original";
    const t = useTranslations("video-control-panel");
    const presets = useConfigStore((s) => s.resolutionPresets);
    const width = usePlaybackWidth();
    const setPlaybackWidth = useVideoPlayerStore((s) => s.setPlaybackWidth);

    if (presets.length === 0) {
        return <></>;
    }

    return (
        <Select
            value={width === null ? ORIGINAL : width.toString()}
            onValueChange={(val) => setPlaybackWidth(val === ORIGINAL ? null : parseInt(val))}
        >
            <SelectTrigger size="sm" className="w-28" aria-label={t("playbackResolution")} title={t("playbackResolution")}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={ORIGINAL}>{t("originalResolution")}</SelectItem>
                {[...presets].sort((a, b) => b - a).map((w) => (
                    <SelectItem key={w} value={w.toString()}>
                        {w}p
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

// A sync session plays on the normal mode, so one screen's loop or next video does not carry everyone along.
export function PlayModeButtons({ videoId }: { videoId: string | null }) {
    const t = useTranslations("video-control-panel");
    const syncing = useSyncing(videoId);
    const chosen = useVideoPlayerStore((s) => s.playMode);
    const playMode = syncing ? "normal" : chosen;
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
                            disabled={syncing}
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

interface PlaybackSetting {
    id: PlaybackSettingId;
    label: string;
    control: ReactNode;
}

export function usePlaybackSettings(videoId: string | null): PlaybackSetting[] {
    const t = useTranslations("video-control-panel");
    const hasPresets = useConfigStore((s) => s.resolutionPresets.length > 0);

    return [
        { id: "rate", label: t("playbackRate"), control: <PlaybackRateSelect /> },
        ...(hasPresets ? [{ id: "resolution" as const, label: t("playbackResolution"), control: <PlaybackResolutionSelect /> }] : []),
        { id: "playMode", label: t("playMode"), control: <PlayModeButtons videoId={videoId} /> },
    ];
}

export function PlaybackSettingsMenu({ settings }: { settings: PlaybackSetting[] }) {
    const t = useTranslations("video-control-panel");
    const barSettings = useVideoPlayerStore((s) => s.barSettings);
    const setBarSetting = useVideoPlayerStore((s) => s.setBarSetting);

    return (
        <>
            <PopoverTrigger asChild>
                <Button size="icon-sm" aria-label={t("playbackSettings")}>
                    <Settings />
                </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" sideOffset={8} alignOffset={8} className="w-auto min-w-96">
                <div className="flex flex-col gap-3">
                    {settings.map(({ id, label, control }) => {
                        const shown = barSettings.includes(id);

                        return (
                            <React.Fragment key={id}>
                                {ControlRow(label, () => (
                                    <div className="flex items-center gap-3">
                                        {control}
                                        <div className="flex h-8 items-center gap-1">
                                            <Separator orientation="vertical" />
                                            <Button
                                                variant={shown ? "accent" : "ghost"}
                                                size="icon-sm"
                                                aria-label={t("showInBar")}
                                                aria-pressed={shown}
                                                onClick={() => setBarSetting(id, !shown)}
                                            >
                                                <Pin />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </div>
            </PopoverContent>
        </>
    );
}

function SyncParticipants() {
    const SHOWN_PARTICIPANTS = 5;
    const t = useTranslations("video-control-panel");
    const participants = usePlayback((s) => s.participants);
    const hidden = participants.length - SHOWN_PARTICIPANTS;

    return (
        <div className="flex flex-col gap-1">
            {participants.slice(0, SHOWN_PARTICIPANTS).map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                    <AccountAvatar email={p.email} className="size-5" />
                    {p.name}
                </div>
            ))}
            {hidden > 0 && <span>{t("moreParticipants", { count: hidden })}</span>}
        </div>
    );
}

export function SyncButton({ videoId }: { videoId: string | null }) {
    const t = useTranslations("video-control-panel");
    const syncing = useSyncing(videoId);
    const joining = useJoining(videoId);
    const participants = usePlayback((s) => s.participants);
    const router = useRouter();
    const syncLink = usePlayback((s) => s.syncLink);
    const setSyncLink = usePlayback((s) => s.setSyncLink);

    if (!videoId) {
        return null;
    }

    const toggle = () => {
        if (syncing) {
            leaveSync();
            return;
        }

        joinSync(videoId, router);
        // The first one in hands out the link; later ones are joining a session that already has it.
        if (participants.length === 0) {
            setSyncLink(createVideoJoinLink(window.location.origin, videoId));
        }
    };

    const closeLink = (open: boolean) => {
        if (!open) {
            setSyncLink(null);
        }
    };

    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Toggle
                        variant="outline"
                        size="sm"
                        aria-label={t("syncPlayback")}
                        pressed={syncing}
                        onPressedChange={toggle}
                    >
                        <Users />
                        {participants.length > 0 && participants.length}
                    </Toggle>
                </TooltipTrigger>
                <TooltipContent>
                    {participants.length === 0 ? t("syncPlayback") : <SyncParticipants />}
                </TooltipContent>
            </Tooltip>
            <ShareLinkDialog url={syncLink ?? ""} open={syncLink !== null} onOpenChange={closeLink} />
            {joining && <SyncJoinDialog onAnswer={(join) => join ? joinSync(videoId, router) : leaveSync()} />}
        </>
    );
}

export function PresentButton({ videoId }: { videoId: string | null }) {
    const t = useTranslations("video-control-panel");
    const syncing = useSyncing(videoId);
    const presenter = usePlayback((s) => s.presenter);
    const presenting = usePlayback((s) => s.presenting);
    const requester = usePlayback((s) => s.requester);
    const requesting = usePlayback((s) => s.requesting);
    const connectionId = usePlayback((s) => s.connectionId);
    const locked = usePresenterLock();

    if (!videoId || !syncing) {
        return null;
    }

    let label = t("present");
    if (requesting) {
        label = t("waitingForPresenter", { name: presenter?.name ?? "" });
    } else if (locked) {
        label = t(requester === null ? "requestHandover" : "presenting", { name: presenter?.name ?? "" });
    } else if (presenting) {
        label = t("stopPresenting");
    }

    const sendPresenting = (pressed: boolean) => {
        if (connectionId !== null) {
            void putPresenter(videoId, connectionId, pressed);
        }
    };

    return (
        <>
            <Toggle
                variant="outline"
                size="sm"
                aria-label={label}
                title={label}
                pressed={presenting || requesting}
                disabled={connectionId === null || (requester !== null && !requesting)}
                onPressedChange={sendPresenting}
            >
                <Presentation />
                {locked && <AccountAvatar email={presenter?.email ?? null} className="size-5" />}
                {requesting && <Spinner />}
            </Toggle>
            {presenting && requester !== null && <PresenterRequestDialog requester={requester} onAnswer={sendPresenting} />}
        </>
    );
}
