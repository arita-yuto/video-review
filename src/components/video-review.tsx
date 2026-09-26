"use client"
import React, { useRef, useEffect, useState, useMemo } from "react";
import { useVideoReviewStore } from "@/stores/video-review-store";
import VideoTimelineBar from "@/components/video-timeline-bar";
import { EPlayMode, useVideoPlayerStore } from "@/stores/video-player-store";
import VideoControlPanel from "@/components/video-control-panel";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoStore } from "@/stores/video-store";
import VideoTitle from "@/components/video-title";
import { VideoComment } from "@/lib/db-types";
import { useDrawingStore } from "@/stores/drawing-store";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import { useDrawingCanvas } from "@/lib/hooks/use-drawing-canvas";
import { useDrawingSettingsStore } from "@/stores/drawing-settings-store";
import { brushCursor } from "@/lib/drawing/cursor";
import { useTranslations } from "next-intl";
import { resolveMediaUrl } from "@/lib/media-url";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { LoadingBadge } from "@/components/controls/loading-badge";

export default function VideoReview() {
    const t = useTranslations("video-review");
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

    const {
        setCanvasRefElement,
        setCanvasSize,
        setCanvasEditing,
        canvasSize,
        canvasEditing,
        drawings,
        loadDrawing } = useDrawingStore();
    const editing = useCommentEditStore((s) => s.editingComment !== null);
    const brushWidth = useDrawingSettingsStore((s) => s.width);

    useDrawingCanvas();

    // Keyed on the boolean: entering a session resets the history, and the edited
    // comment object is replaced while saving, which must not count as a new session.
    useEffect(() => {
        setCanvasEditing(editing);
    }, [editing]);

    const { token } = useAuthStore();

    const {
        videos,
        nextVideo,
        selectedVideo,
        selectedRevision,
        loading,
    } = useVideoStore();

    const { comments, fetchComments } = useCommentStore();
    const {
        activeComments,
        setVideoRefElement,
        selectedComment,
        currentTime,
        timelineTime,
        setSelectComment,
        setActiveComments,
        setTimelineTime,
        setCurrentTime,
        setDuration } = useVideoReviewStore();

    const {
        playMode,
        isPlaying,
        togglePlay,
        volume,
        volumeEnabled,
        setIsPlaying,
        playbackRate,
    } = useVideoPlayerStore();

    const playModeRef = useRef<EPlayMode>(playMode);
    const timelineTimeRef = useRef<number>(timelineTime);

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

        if (timelineTimeRef.current !== null) {
            setCurrentTime(timelineTimeRef.current);
            v.currentTime = timelineTimeRef.current;
        }
    }

    useEffect(() => {
        if (!token)
            router.replace("/video-review/login");
    }, [token]);

    useEffect(() => {
        playModeRef.current = playMode;
    }, [playMode]);

    useEffect(() => {
        for (const c of comments) {
            if (c.drawingPath) void loadDrawing(c.drawingPath);
        }
    }, [comments]);

    // While a comment is being edited the drawing hook owns the canvas; repainting here
    // would wipe the strokes in progress.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || canvasEditing) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // The selection holds the object from click time; after a save the list has a
        // newer one (a first drawing adds its path), so look the comment up again.
        const current = selectedComment && (comments.find((c) => c.id === selectedComment.id) ?? selectedComment);
        const toDraw = isPlaying ? activeComments : (current ? [current] : []);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const comment of toDraw) {
            const img = comment.drawingPath ? drawings.get(comment.drawingPath) : undefined;
            if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
    }, [activeComments, selectedComment, comments, isPlaying, canvasEditing, canvasSize, drawings]);

    // Keep the canvas's backing store at the video's on-screen size times the current
    // device pixel ratio. Both change when the window moves to another display, and a
    // canvas fitted on one display draws offset and blurry on the other.
    useEffect(() => {
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c) return;

        const fit = () => {
            const rect = v.getBoundingClientRect();
            const ratio = window.devicePixelRatio || 1;
            const width = Math.round(rect.width * ratio);
            const height = Math.round(rect.height * ratio);
            if (width === 0 || height === 0 || (c.width === width && c.height === height)) return;

            c.width = width;
            c.height = height;
            setCanvasSize({ width, height });
        };

        const observer = new ResizeObserver(fit);
        observer.observe(v);

        // matchMedia has no "ratio changed" event; a query that matches only the current
        // ratio flips to false when it changes, then we re-arm for the new one.
        let ratioQuery: MediaQueryList | null = null;
        const watchRatio = () => {
            ratioQuery?.removeEventListener("change", onRatioChange);
            ratioQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
            ratioQuery.addEventListener("change", onRatioChange);
        };
        const onRatioChange = () => {
            fit();
            watchRatio();
        };
        watchRatio();

        return () => {
            observer.disconnect();
            ratioQuery?.removeEventListener("change", onRatioChange);
        };
    }, [selectedRevision]);

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
        setCanvasRefElement(canvasRef.current);
    }, [canvasRef.current]);

    useEffect(() => {
        setVideoRefElement(videoRef.current);
    }, [videoRef.current]);

    useEffect(() => {
        setCurrentTime(0);
    }, [selectedVideo])

    useEffect(() => {
        if (selectedRevision == null) return

        const v = videoRef.current;
        if (!v) return;

        fetchComments(selectedRevision);

        let canceled = false;
        void (async () => {
            const url = await resolveMediaUrl(selectedRevision.filePath);
            if (url && !canceled) {
                setPlaybackUrl(url);
            }
        })();

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onMeta = () => {
            setDuration(v.duration);
            v.playbackRate = playbackRate;
            v.volume = volumeEnabled ? volume : 0.0;
        }
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
        v.addEventListener("play", onPlay);
        v.addEventListener("pause", onPause);
        v.addEventListener("timeupdate", onTimeUpdate);
        v.addEventListener("ended", onEnded);

        return () => {
            canceled = true;
            v.removeEventListener("play", onPlay);
            v.removeEventListener("pause", onPause);
            v.removeEventListener("loadedmetadata", onMeta);
            v.removeEventListener("timeupdate", onTimeUpdate);
            v.removeEventListener("ended", onEnded);
        };
    }, [selectedRevision]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) {
            return;
        }

        if (isPlaying) {
            v.play();
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
        <>
            <div className="flex flex-col h-full w-full border-r">
                {loading
                    ?
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <LoadingBadge>Videos Syncing...</LoadingBadge>
                    </div>
                    :
                    <>
                        <VideoTitle />
                        {selectedRevision ? (
                            <>
                                <div className="flex-1 flex flex-col items-center justify-center bg-black rounded mb-3 relative">
                                    <div className="relative inline-block">
                                        <video
                                            ref={videoRef}
                                            src={playbackUrl ?? undefined}
                                            onClick={togglePlay}
                                            className="video-stage max-w-full rounded cursor-pointer object-contain"
                                        />
                                        <canvas
                                            ref={canvasRef}
                                            className={cn(
                                                "absolute top-0 left-0 w-full h-full touch-none",
                                                canvasEditing ? "pointer-events-auto brush-cursor" : "pointer-events-none",
                                            )}
                                            style={{ "--brush-cursor": brushCursor(brushWidth) } as React.CSSProperties}
                                        />
                                    </div>
                                </div>

                                <VideoTimelineBar />
                                <VideoControlPanel />
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                {t("noVideoSelected")}
                            </div>
                        )}
                    </>
                }
            </div>
        </>
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