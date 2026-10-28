"use client"
import VideoReview from "@/components/video-review";
import { useVideoReviewStore } from "@/stores/video-review-store";
import { usePlayback } from "@/stores/playback-store";
import { useVideoStore } from "@/stores/video-store";
import { useParams, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import { api } from "@/lib/api-client";
import { fetchVideoEvents } from "@/stores/video-event-store";
import { useAuthStore } from "@/stores/auth-store";
import { useConfigStore } from "@/stores/config-store";
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
                const res = await api.videos[":id"].$get({ param: { id: videoId as string } });
                if (res.status !== 200) throw new Error("Failed to fetch video");
                await selectVideo(await res.json());

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
            setTimeout(async () => {
                const res = await api.comments[":id"].$get({ param: { id: commentId as string } });
                if (res.status !== 200) throw new Error("Failed to fetch comment");
                const comment = await res.json();
                setTimelineTime(comment.time);
                setSelectComment(comment, "link");
            }, 100);
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
