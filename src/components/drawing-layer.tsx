"use client";

import React, { useEffect } from "react";
import { useDrawingStore } from "@/stores/drawing-store";
import { useDrawingSettingsStore } from "@/stores/drawing-settings-store";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { useVideoPlayerStore } from "@/stores/video-player-store";
import { useDrawingCanvas } from "@/lib/hooks/use-drawing-canvas";
import { toolClass } from "@/lib/drawing/tools";
import { EyedropperPreview } from "@/components/drawing-tool-panel/eyedropper-preview";
import { cn } from "@/lib/utils";

/**
 * The canvas over the video: shows the drawings of the comments at the playhead and,
 * while a comment is being edited, hands itself to the drawing hook.
 */
export function DrawingLayer() {
    const video = useVideoReviewStore((s) => s.videoRefElement);
    const {
        canvasRefElement: canvas,
        setCanvasRefElement,
        setCanvasSize,
        setCanvasEditing,
        canvasSize,
        canvasEditing,
        drawings,
        picking,
        loadDrawing,
    } = useDrawingStore();
    const editing = useCommentEditStore((s) => s.editingComment !== null);
    const { comments } = useCommentStore();
    const { activeComments, selectedComment } = useVideoReviewStore();
    const isPlaying = useVideoPlayerStore((s) => s.isPlaying);
    const cursor = useDrawingSettingsStore((s) => toolClass(s.tool).cursor(s.params[s.tool]));

    useDrawingCanvas();

    // Only on a real change: starting a session resets the history, and this layer
    // remounts with the player (the comment object also churns while saving).
    useEffect(() => {
        if (useDrawingStore.getState().canvasEditing !== editing) setCanvasEditing(editing);
    }, [editing]);

    useEffect(() => {
        for (const c of comments) {
            if (c.drawingPath) void loadDrawing(c.drawingPath);
        }
    }, [comments]);

    // While editing, the drawing hook owns the canvas.
    useEffect(() => {
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || canvasEditing) return;

        // The selection is the object from click time; a save may have replaced it.
        const current = selectedComment && (comments.find((c) => c.id === selectedComment.id) ?? selectedComment);
        const toDraw = isPlaying ? activeComments : (current ? [current] : []);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const comment of toDraw) {
            const img = comment.drawingPath ? drawings.get(comment.drawingPath) : undefined;
            if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
    }, [canvas, activeComments, selectedComment, comments, isPlaying, canvasEditing, canvasSize, drawings]);

    // Backing store = on-screen size × device pixel ratio; both change when the window
    // moves to another display.
    useEffect(() => {
        if (!video || !canvas) return;

        const fit = () => {
            const rect = video.getBoundingClientRect();
            const ratio = window.devicePixelRatio || 1;
            const width = Math.round(rect.width * ratio);
            const height = Math.round(rect.height * ratio);
            if (width === 0 || height === 0 || (canvas.width === width && canvas.height === height)) return;

            canvas.width = width;
            canvas.height = height;
            setCanvasSize({ width, height });
        };

        const observer = new ResizeObserver(fit);
        observer.observe(video);

        // No "ratio changed" event exists: a query matching the current ratio flips
        // when it changes, then is re-armed.
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
    }, [video, canvas]);

    return (
        <>
            <canvas
                ref={setCanvasRefElement}
                className={cn(
                    "absolute top-0 left-0 w-full h-full touch-none",
                    canvasEditing ? "pointer-events-auto brush-cursor" : "pointer-events-none",
                )}
                style={{ "--brush-cursor": cursor } as React.CSSProperties}
            />
            {picking && <EyedropperPreview picking={picking} video={video} drawing={canvas} />}
        </>
    );
}
