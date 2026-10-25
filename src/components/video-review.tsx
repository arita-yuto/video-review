"use client"
import { useRef, useEffect, useState, useMemo, useCallback, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { usePlayback } from "@/stores/playback-store";
import VideoTimelineBar from "@/components/video-timeline-bar";
import { EPlayMode, useVideoPlayerStore } from "@/stores/video-player-store";
import VideoControlPanel from "@/components/video-control-panel";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoStore } from "@/stores/video-store";
import VideoTitle from "@/components/video-title";
import { VideoComment, VideoRevision } from "@/lib/db-types";
import { DrawingLayer } from "@/components/drawing-layer";
import { useTranslations } from "next-intl";
import { resolveMediaUrl } from "@/lib/media-url";
import { createLoginLink } from "@/lib/url";
import { downscaledVideoKey } from "@/lib/storage-key";
import { usePlaybackWidth } from "@/lib/hooks/use-playback-width";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { LoadingBadge } from "@/components/controls/loading-badge";
import { Spinner } from "@/components/ui/spinner";
import { useFullscreenSync } from "@/lib/hooks/use-fullscreen-sync";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { useIdle } from "@/lib/hooks/use-idle";
import { useVideoStream } from "@/lib/hooks/use-video-stream";
import { useSyncedPlayback } from "@/lib/hooks/use-synced-playback";
import { usePresenterLock, useSyncing } from "@/lib/sync-session";
import { cn } from "@/lib/utils";
import { PortalContainerContext } from "@/lib/portal-container";
import { Toaster } from "@/components/ui/sonner";

// Well under one frame, so two times this close apart show the same picture.
const SAME_TIME_S = 0.001;
// How long the overlaid title and controls stay before fading.
const FADE_AFTER_MS = 3000;

export default function VideoReview() {
    const t = useTranslations("video-review");
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
    // Feeds video-fit; 16/9 until loadedmetadata.
    const [videoAspect, setVideoAspect] = useState("16 / 9");
    // Waiting for data while playing, such as after a jump to the sync session's position.
    const [buffering, setBuffering] = useState(false);
    const playbackWidth = usePlaybackWidth();
    // Which revision the element currently holds, to tell a resolution switch, a revision switch and a new video apart.
    const loadedRevisionRef = useRef<VideoRevision | null>(null);

    const { token } = useAuthStore();

    const {
        videos,
        nextVideo,
        selectedVideo,
        selectedRevision,
        loading,
    } = useVideoStore();

    useVideoStream(selectedVideo?.id ?? null);
    useSyncedPlayback(selectedVideo?.id ?? null);
    const syncing = useSyncing(selectedVideo?.id ?? null);

    const { comments, fetchComments } = useCommentStore();
    const {
        setVideoRefElement,
        setPlayerElement,
        playerElement,
        fullscreen,
        selectedComment,
        setSelectComment,
        setActiveComments } = useVideoReviewStore();

    useFullscreenSync();
    const isMobile = useIsMobile();
    // While the picture fills the player the title and controls overlay it, so they fade when left alone.
    const { idle, wake } = useIdle(fullscreen || isMobile, FADE_AFTER_MS);
    const controlsRef = useRef<HTMLDivElement>(null);
    const tapWakesRef = useRef(false);
    const locked = usePresenterLock();

    const {
        isPlaying,
        currentTime,
        timelineTime,
        togglePlay,
        setIsPlaying,
        setTimelineTime,
        setCurrentTime,
        setDuration } = usePlayback((s) => s);

    const {
        playMode,
        volume,
        volumeEnabled,
        playbackRate,
    } = useVideoPlayerStore();

    const playModeRef = useRef<EPlayMode>(playMode);
    const timelineTimeRef = useRef<number>(timelineTime);

    // A callback ref keeps the store's element current across remounts of the player.
    const attachVideo = useCallback((el: HTMLVideoElement | null) => {
        videoRef.current = el;
        setVideoRefElement(el);
    }, []);

    const { commentTimeBasedMap, commentTimeList } = useMemo(() => {
        const m = new Map<number, VideoComment[]>();
        const times: number[] = [];

        for (const c of comments) {
            const t = Number(c.time.toFixed(2));
            if (!m.has(t)) {
                m.set(t, []);
                times.push(t);
            }
            m.get(t)!.push(c);
        }

        times.sort((a, b) => a - b);
        return { commentTimeBasedMap: m, commentTimeList: times };
    }, [comments]);

    const applyTimelineTime = () => {
        const v = videoRef.current;
        if (!v) return;

        const target = timelineTimeRef.current;
        if (target === null) {
            return;
        }

        setCurrentTime(target);
        // Seeking a paused video to where it already is can show the neighbouring frame.
        if (v.paused && Math.abs(v.currentTime - target) < SAME_TIME_S) {
            return;
        }
        v.currentTime = target;
    }

    // A touch while the controls are faded only brings them back; a mouse click still plays or pauses.
    const onStagePointerDown = (e: PointerEvent<HTMLDivElement>) => {
        const controls = controlsRef.current;
        tapWakesRef.current = e.pointerType === "touch" && controls !== null && getComputedStyle(controls).opacity === "0";
    };

    // Black bars beside the picture play and pause like the picture; canvas clicks are strokes.
    const onStageClick = (e: MouseEvent<HTMLDivElement>) => {
        if (tapWakesRef.current || locked) {
            return;
        }
        if (e.target === e.currentTarget || e.target === videoRef.current) {
            togglePlay();
        }
    };

    useEffect(() => {
        if (!token) {
            router.replace(createLoginLink(window.location.pathname + window.location.search));
        }
    }, [token]);

    useEffect(() => {
        // A sync session plays on the normal mode, as the play mode buttons show.
        playModeRef.current = syncing ? "normal" : playMode;
    }, [playMode, syncing]);

    useEffect(() => {
        if (selectedComment && selectedComment.time !== currentTime) {
            setSelectComment(null);
        }

        const now = currentTime;
        const eps = 0.3;
        const activeIndex = findFirstWithinEps(commentTimeList, currentTime, eps);
        if (activeIndex !== null) {
            const active = commentTimeBasedMap.get(commentTimeList[activeIndex]) ?? [];
            setActiveComments(active);
        } else {
            setActiveComments([]);
        }
    }, [currentTime])

    useEffect(() => {
        setCurrentTime(0);
    }, [selectedVideo])

    useEffect(() => {
        if (selectedRevision == null) {
            return;
        }
        fetchComments(selectedRevision);
    }, [selectedRevision]);

    // The video list is outside the player, so picking there would otherwise leave the new title faded.
    useEffect(() => {
        wake();
    }, [selectedRevision, wake]);

    useEffect(() => {
        if (selectedRevision == null) return

        const v = videoRef.current;
        if (!v) return;

        let resume: { time: number; playing: boolean } | null = null;
        let canceled = false;
        let variantLoaded = false;

        const isRevisionSwitch = (loaded: VideoRevision | null) =>
            loaded !== null && loaded.videoId === selectedRevision.videoId && loaded.id !== selectedRevision.id;

        // Paused before the store hears of it, so the sync sends where the old revision stopped.
        if (isRevisionSwitch(loadedRevisionRef.current)) {
            v.pause();
            setIsPlaying(false);
        }

        const swapSource = (url: string) => {
            // A revision switch keeps the position, paused, so both revisions can be compared at the same moment.
            const loaded = loadedRevisionRef.current;
            loadedRevisionRef.current = selectedRevision;
            // A new source starts with no data to wait for, and swapping fires no pause to clear the spinner.
            setBuffering(false);
            if (loaded?.videoId !== selectedRevision.videoId) {
                resume = null;
            } else if (isRevisionSwitch(loaded)) {
                resume = { time: v.currentTime, playing: false };
                // Swapping the source stops the element without a pause event.
                setIsPlaying(false);
            } else if (v.readyState !== HTMLMediaElement.HAVE_NOTHING) {
                // After a failed variant the element is empty; the resume taken before it is kept.
                resume = { time: v.currentTime, playing: !v.paused };
            }
            setPlaybackUrl(url);
        };
        const loadOriginal = async () => {
            const url = await resolveMediaUrl(selectedRevision.filePath);
            if (url && !canceled) {
                swapSource(url);
            }
        };
        void (async () => {
            // Plays the chosen variant, or the original when the preset has no file.
            let variant: string | undefined;
            if (playbackWidth !== null) {
                variant = await resolveMediaUrl(downscaledVideoKey(selectedRevision.filePath, playbackWidth));
            }
            if (canceled) {
                return;
            }
            if (variant) {
                variantLoaded = true;
                swapSource(variant);
            } else {
                await loadOriginal();
            }
        })();

        const onPlay = () => setIsPlaying(true);
        const onPause = () => {
            setIsPlaying(false);
            setBuffering(false);
        };
        const onWaiting = () => setBuffering(true);
        const onPlaying = () => setBuffering(false);
        const onMeta = () => {
            setDuration(v.duration);
            setVideoAspect(`${v.videoWidth} / ${v.videoHeight}`);
            // Read now, not from this effect's render: the speed may have changed since the source was picked.
            v.playbackRate = useVideoPlayerStore.getState().playbackRate;
            v.volume = volumeEnabled ? volume : 0.0;
            if (resume) {
                // A jump requested while a paused source loaded, such as the sync session's, wins over the kept position.
                v.currentTime = resume.playing ? resume.time : timelineTimeRef.current ?? resume.time;
                if (resume.playing) {
                    void v.play();
                }
            }
        }
        // Falls back to the original: some storage resolves a URL without checking the file exists.
        const onError = () => {
            if (!variantLoaded) {
                return;
            }
            variantLoaded = false;
            void loadOriginal();
        };
        const onTimeUpdate = () => {
            if (timelineTimeRef.current !== null) {
                return;
            }
            setCurrentTime(v.currentTime);
        };
        const onEnded = () => {
            switch (playModeRef.current) {
                case "normal": break;
                case "loop": {
                    setIsPlaying(true);
                }
                    break;
                case "next": {
                    nextVideo().then((ret) => {
                        if (!ret) return;

                        setTimeout(() => {
                            setIsPlaying(true);
                        }, 300);
                    });
                }
                    break;
            }
        }

        v.addEventListener("loadedmetadata", onMeta);
        v.addEventListener("error", onError);
        v.addEventListener("play", onPlay);
        v.addEventListener("pause", onPause);
        v.addEventListener("waiting", onWaiting);
        v.addEventListener("playing", onPlaying);
        v.addEventListener("timeupdate", onTimeUpdate);
        v.addEventListener("ended", onEnded);

        return () => {
            canceled = true;
            v.removeEventListener("play", onPlay);
            v.removeEventListener("pause", onPause);
            v.removeEventListener("waiting", onWaiting);
            v.removeEventListener("playing", onPlaying);
            v.removeEventListener("loadedmetadata", onMeta);
            v.removeEventListener("error", onError);
            v.removeEventListener("timeupdate", onTimeUpdate);
            v.removeEventListener("ended", onEnded);
        };
    }, [selectedRevision, playbackWidth]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) {
            return;
        }

        if (isPlaying) {
            // The browser can refuse to start without a click, as in a tab opened from a sync link; show it as paused then.
            // A play cut short by a new source is not a refusal; the swap resumes it.
            v.play().catch((e: unknown) => {
                if (e instanceof DOMException && e.name === "NotAllowedError") {
                    setIsPlaying(false);
                }
            });
        } else {
            v.pause();
        }
        setTimelineTime(null);
    }, [isPlaying]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) {
            return;
        }
        v.playbackRate = playbackRate;
    }, [playbackRate]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) {
            return;
        }
        if (volumeEnabled) {
            v.volume = volume;
        } else {
            v.volume = 0.0;
        }
    }, [volume, volumeEnabled]);

    useEffect(() => {
        timelineTimeRef.current = timelineTime;
        applyTimelineTime();
    }, [selectedRevision, timelineTime]);

    return (
        // Dropdowns and dialogs opened from the player must render inside it while it is fullscreen.
        <PortalContainerContext.Provider value={fullscreen ? playerElement : null}>
            <div
                ref={setPlayerElement}
                data-idle={idle || undefined}
                onPointerDown={wake}
                onPointerMove={wake}
                className="relative flex flex-col h-full w-full border-r"
            >
                {/* A list refresh must keep the <video> mounted; only the first load shows the badge. */}
                {loading && !selectedRevision
                    ?
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <LoadingBadge>Videos Syncing...</LoadingBadge>
                    </div>
                    :
                    <>
                        <VideoTitle />
                        {selectedRevision ? (
                            <>
                                <div
                                    data-slot="video-stage"
                                    onClick={onStageClick}
                                    onPointerDown={onStagePointerDown}
                                    className={cn(
                                        "video-stage flex-1 min-h-0 flex items-center justify-center bg-black rounded mb-3 relative immersive:rounded-none immersive:mb-0",
                                        !locked && "cursor-pointer",
                                        isMobile && !fullscreen && "portrait:flex-none portrait:video-stage-mobile",
                                    )}
                                    style={{ "--video-aspect": videoAspect } as CSSProperties}
                                >
                                    <div className="video-fit relative">
                                        <video
                                            ref={attachVideo}
                                            src={playbackUrl ?? undefined}
                                            playsInline
                                            className="w-full h-full rounded"
                                        />
                                        <DrawingLayer />
                                        {buffering && <Spinner size="player" className="absolute inset-0 m-auto pointer-events-none" />}
                                    </div>
                                </div>

                                {/* Overlaid so the picture can fill the player. */}
                                <div ref={controlsRef} className="immersive:absolute immersive:inset-x-0 immersive:bottom-0 immersive:px-2 transition-opacity duration-300 immersive:idle:opacity-0 immersive:idle:pointer-events-none">
                                    <VideoTimelineBar />
                                    <VideoControlPanel />
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                {t("noVideoSelected")}
                            </div>
                        )}
                    </>
                }
                {/* The app's toaster sits in body, which the browser hides while the player is fullscreen.
                    Lifted above the timeline and the control bar so it covers no buttons. */}
                {fullscreen && <Toaster offset={{ bottom: "6.5rem" }} />}
            </div>
        </PortalContainerContext.Provider>
    );
}

function findFirstWithinEps(arr: number[], target: number, eps: number): number | null {
    let lo = 0, hi = arr.length - 1;

    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] <= target) lo = mid + 1;
        else hi = mid - 1;
    }

    const candidates = [hi, hi + 1];
    for (const i of candidates) {
        if (i >= 0 && i < arr.length) {
            if (Math.abs(arr[i] - target) <= eps) return i;
        }
    }

    return null;
}