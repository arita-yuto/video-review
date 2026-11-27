"use client"
import VideoReview from "@/components/review/player";
import { useVideoReviewStore } from "@/components/review/stores/video-review-store";
import { usePlayback } from "@/components/review/stores/playback-store";
import { useLinkedComment } from "@/components/review/hooks/use-linked-comment";
import { useVideoStore } from "@/components/stores/video-store";
import { fetchVideoEvents } from "@/components/review/stores/video-event-store";
import { useParams, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import { api } from "@/api";
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

    const {
        verifyAuth,
    } = useAuthStore();

    const {
        selectVideo,
        selectVideoRevision,
        loading,
    } = useVideoStore();

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
        if (!videoId) return;
        void (async () => {
            try {
                const loaded = useVideoStore.getState();
                const revisionLoaded = loaded.revisions.some((r) => r.id === revisionParam);

                // Selecting the loaded video again reloads the player, so a URL naming one of its loaded revisions skips it.
                // A URL without a revision still selects the video again.
                if (loaded.selectedVideo?.id !== videoId || !revisionLoaded) {
                    const res = await api.videos[":id"].$get({ param: { id: videoId as string } });
                    if (res.status !== 200) throw new Error("Failed to fetch video");
                    await selectVideo(await res.json());
                }

                if (revisionParam) {
                    const { revisions } = useVideoStore.getState();
                    const target = revisions.find((r) => r.id === revisionParam);
                    if (target) selectVideoRevision(target);
                }

                if (eventContentId) {
                    const { selectedRevision } = useVideoStore.getState();
                    if (selectedRevision) {
                        const events = await fetchVideoEvents({
                            videoId: selectedRevision.videoId,
                            selectRevision: selectedRevision.revision,
                        });
                        const target = events.find((e) => e.contentId === eventContentId);
                        if (target) setTimelineTime(target.startMs / 1000);
                    }
                }
            } catch (error) {
                console.log("not found videoId", error);
            }
        })();
    }, [videoId, revisionParam, eventContentId]);

    useEffect(() => {
        if(loading) return;
        
        const duration = searchParams.get("t");
        const commentId = searchParams.get("comment");
        if (duration) {
            setTimelineTime(parseFloat(duration));
        } else if (commentId) {
            setTimeout(() => selectLinkedComment(commentId), 100);
        } else {
            setTimelineTime(null);
            setSelectComment(null);
        }
    }, [loading]);

    return (
        <div className="flex h-full">
            <VideoReview />
        </div>
    );
}
