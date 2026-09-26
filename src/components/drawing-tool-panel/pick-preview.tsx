"use client";

import React, { useEffect, useRef } from "react";

const RING_SIZE = 96;
const HOLE_RADIUS = 34;
const ZOOM = 4;

/**
 * What the eyedropper shows while pressed: a ring whose top half is the colour being
 * picked and bottom half the one it replaces, with the spot under the pointer
 * magnified in the hole.
 */
export function PickPreview({ picking, video, drawing }: {
    picking: { x: number; y: number; color: string; previous: string };
    video: HTMLVideoElement | null;
    drawing: HTMLCanvasElement | null;
}) {
    const glassRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const glass = glassRef.current;
        const ctx = glass?.getContext("2d");
        if (!glass || !ctx || !drawing) return;

        const scale = window.devicePixelRatio || 1;
        const side = HOLE_RADIUS * 2;
        glass.width = side * scale;
        glass.height = side * scale;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, glass.width, glass.height);

        // The hole shows side / ZOOM CSS pixels of the frame around the point.
        const rect = drawing.getBoundingClientRect();
        const spanX = side / ZOOM / rect.width;
        const spanY = side / ZOOM / rect.height;
        const region = (width: number, height: number) => [
            (picking.x - spanX / 2) * width,
            (picking.y - spanY / 2) * height,
            spanX * width,
            spanY * height,
        ] as const;

        try {
            if (video && video.videoWidth > 0) {
                ctx.drawImage(video, ...region(video.videoWidth, video.videoHeight), 0, 0, glass.width, glass.height);
            }
        } catch {
            // A frame from another origin cannot be copied; the drawing alone is still useful.
        }
        ctx.drawImage(drawing, ...region(drawing.width, drawing.height), 0, 0, glass.width, glass.height);
    }, [picking, video, drawing]);

    return (
        <div
            data-slot="pick-preview"
            className="pointer-events-none absolute left-(--pick-x) top-(--pick-y) size-(--pick-size) -translate-1/2"
            style={{
                "--pick-x": `${picking.x * 100}%`,
                "--pick-y": `${picking.y * 100}%`,
                "--pick-size": `${RING_SIZE}px`,
                "--pick-new": picking.color,
                "--pick-old": picking.previous,
                "--ring-inner": `${HOLE_RADIUS}px`,
                "--pick-hole": `${HOLE_RADIUS * 2}px`,
            } as React.CSSProperties}
        >
            <canvas ref={glassRef} className="absolute inset-0 m-auto size-(--pick-hole) rounded-full" />
            <div className="pick-preview absolute inset-0" />
        </div>
    );
}
