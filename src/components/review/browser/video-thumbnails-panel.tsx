"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/ui/button";
import { useTranslations } from "next-intl";
import { VideoWithRevision } from "@/lib/db-types";
import { useSidebar } from "@/ui/sidebar";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import VideoThumbnails from "@/components/review/browser/video-thumbnails";
import type { MarkContext } from "@/components/review/browser/marks/use-mark-context";
import { Panel } from "@/components/controls/panel";

// Radix layers that own Escape while open: dialogs, and anything in the popper wrapper.
const OTHER_LAYERS = '[role="dialog"], [data-radix-popper-content-wrapper]';

type Props = {
    open: boolean;
    videos: VideoWithRevision[];
    markContext: MarkContext;
    selectedVideoId: string | undefined;
    onSelectVideo: (videoId: string) => void;
    onClose: () => void;
};

export default function VideoThumbnailsPanel({
    open,
    videos,
    markContext,
    selectedVideoId,
    onSelectVideo,
    onClose,
}: Props) {
    const panelRef = useRef<HTMLDivElement>(null);
    const { state } = useSidebar();
    const isMobile = useIsMobile();
    // --sidebar-width stays set while the sidebar is collapsed off-canvas.
    const offset = state === "collapsed" ? "0px" : "var(--sidebar-width)";

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            // Radix's Escape handler does not stop propagation; let the topmost layer take it.
            if (document.querySelector(OTHER_LAYERS)) return;
            onClose();
        };

        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Element | null;
            if (panelRef.current?.contains(target as Node)) return;
            // Only the review area counts as outside: dialogs and popovers are portaled to the document root and must not dismiss the panel.
            if (!target?.closest('[data-slot="review-main"]')) return;
            onClose();
        };

        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("pointerdown", onPointerDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("pointerdown", onPointerDown);
        };
    }, [open, onClose]);

    const t = useTranslations("video-list-panel");

    // Below the mobile breakpoint the sidebar is a modal sheet whose overlay would cover this panel.
    if (!open || isMobile) return null;

    return (
        <Panel
            variant="floating"
            ref={panelRef}
            data-slot="thumbnails-panel"
            style={{ "--panel-offset": offset } as React.CSSProperties}
            className="thumbnails-panel fixed top-0 bottom-0 z-40 w-184"
        >
            <div className="flex items-center justify-between px-3 py-2 border-b text-sm font-semibold text-primary">
                <span>{t("thumbnails")}</span>
                <Button variant="toolbar" size="icon-sm" onClick={onClose} aria-label={t("thumbnailsClose")}>
                    <X className="size-5" />
                </Button>
            </div>

            <div className="flex-1 min-h-0">
                <VideoThumbnails
                    videos={videos}
                    markContext={markContext}
                    selectedVideoId={selectedVideoId}
                    onSelectVideo={(id) => {
                        onSelectVideo(id);
                        onClose();
                    }}
                />
            </div>
        </Panel>
    );
}
