import { useEffect, useRef, useState } from "react";
import { VideoWithRevision } from "@/lib/db-types";
import { resolveMediaUrl } from "@/lib/media-url";
import { Spinner } from "@/components/ui/spinner";
import { useThumbnailGridStore } from "@/stores/thumbnail-grid-store";

export const thumbnailKey = (videoId: string) => `thumbnails/${videoId}/thumb.png`;

type Props = {
    video: VideoWithRevision;
    containerRef: React.RefObject<HTMLDivElement | null>;
};

export function ThumbnailLazyLoader({ video, containerRef }: Props) {
    const ref = useRef<HTMLDivElement | null>(null);
    const key = thumbnailKey(video.id);
    // Only this video's URL, so resolving another thumbnail doesn't redraw this one.
    const cached = useThumbnailGridStore((s) => s.urls.get(key));
    const cacheUrl = useThumbnailGridStore((s) => s.cacheUrl);
    const [isResolving, setIsResolving] = useState(false);

    useEffect(() => {
        if (!ref.current || cached !== undefined) return;

        const observer = new IntersectionObserver(
            entries => {
                if (!entries[0].isIntersecting) return;

                setIsResolving(true);
                resolveMediaUrl(key)
                    .then(url => cacheUrl(key, url))
                    .finally(() => {
                        setIsResolving(false);
                        observer.disconnect();
                    });
            },
            { root: containerRef.current, rootMargin: "200px" }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [cached, key]);

    return (
        <div ref={ref} className="bg-background aspect-video">
            {cached ? (
                <img src={cached} alt="" className="w-full h-full object-cover" />
            ) : isResolving ? (
                <div className="flex items-center justify-center w-full h-full">
                    <Spinner />
                </div>
            ) : (
                <div className="flex items-center justify-center text-xs text-muted-foreground w-full h-full">
                    thumbnail
                </div>
            )}
        </div>
    );
}
