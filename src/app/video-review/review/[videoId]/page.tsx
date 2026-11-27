"use client"
import { useVideoReviewStore } from "@/components/review/stores/video-review-store";
import { usePlayback } from "@/components/review/stores/playback-store";
import { useLinkedComment } from "@/components/review/hooks/use-linked-comment";
import { useOpenVideo } from "@/components/review/hooks/use-open-video";
import { useVideoStore } from "@/components/stores/video-store";
import { fetchVideoEvents } from "@/components/review/stores/video-event-store";
import { useParams, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import { useAuthStore } from "@/components/stores/auth-store";
import { useConfigStore } from "@/components/stores/config-store";
import { useRouter } from "next/navigation";
import { createLoginLink } from "@/lib/url";

export default function VideoReviewPage() {
    const router = useRouter();
    const { videoId } = useParams();
    const searchParams = useSearchParams();
    // Read as strings so a change to another parameter (joining sync) does not reload the video.
    const revisionParam = searchParams.get("revision");
    const eventContentId = searchParams.get("event");
    const timeParam = searchParams.get("t");
    const commentParam = searchParams.get("comment");

    const {
        verifyAuth,
    } = useAuthStore();

    const {
        selectVideoRevision,
    } = useVideoStore();

    const openVideo = useOpenVideo();

    const setSelectComment = useVideoReviewStore((s) => s.setSelectComment);
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const selectLinkedComment = useLinkedComment();

    useEffect(() => {
        void (async () => {
            if (!(await verifyAuth())) {
                router.replace(createLoginLink(window.location.pathname + window.location.search));
                return;
            }
            void useConfigStore.getState().loadConfig();
        })();
    }, []);

    useEffect(() => {
        // Without a token the page is leaving for the login screen.
        if (!videoId || !useAuthStore.getState().token) {
            return;
        }

        let cancelled = false;
        let commentTimer: ReturnType<typeof setTimeout> | undefined;

        void (async () => {
            try {
                const loaded = useVideoStore.getState();
                const loadedRevision = loaded.selectedVideo?.id === videoId
                    ? loaded.revisions.find((r) => r.id === revisionParam)
                    : undefined;

                // Opening the loaded video again reloads the player, so a URL naming one of its loaded revisions only switches to it.
                // A URL without a revision still opens the video again.
                if (loadedRevision) {
                    selectVideoRevision(loadedRevision);
                } else {
                    const opened = await openVideo(videoId as string, revisionParam);
                    if (!opened || cancelled) {
                        return;
                    }
                }

                let eventTime: number | null = null;

                if (eventContentId) {
                    const { selectedRevision } = useVideoStore.getState();
                    if (selectedRevision) {
                        const events = await fetchVideoEvents({
                            videoId: selectedRevision.videoId,
                            selectRevision: selectedRevision.revision,
                        });

                        if (cancelled) {
                            return;
                        }

                        const target = events.find((e) => e.contentId === eventContentId);
                        if (target) {
                            eventTime = target.startMs / 1000;
                        }
                    }
                }

                if (timeParam) {
                    setTimelineTime(parseFloat(timeParam));
                } else if (commentParam) {
                    commentTimer = setTimeout(() => selectLinkedComment(commentParam), 100);
                } else {
                    setTimelineTime(eventTime);
                    setSelectComment(null);
                }
            } catch (error) {
                console.log("not found videoId", error);
            }
        })();

        return () => {
            cancelled = true;
            clearTimeout(commentTimer);
        };
    }, [videoId, revisionParam, eventContentId, timeParam, commentParam]);

    return null;
}
