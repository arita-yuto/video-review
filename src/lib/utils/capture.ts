/**
 * The current video frame as a PNG, at the video's own resolution. An overlay (the drawing
 * canvas) is stretched onto it: it covers the same area as the video, so only the scale differs.
 */
export function captureFrame(video: HTMLVideoElement | null, overlay?: CanvasImageSource | null): Promise<Blob | null> {
    return new Promise((resolve) => {
        if (video === null) return resolve(null);

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (overlay) ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/png");
    });
}
