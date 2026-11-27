import { toast } from "sonner";
import { api, readError } from "@/api";
import { useVideoStore } from "@/components/stores/video-store";
import { queryComments, useCommentStore } from "@/components/review/stores/comment-store";
import { usePlayback } from "@/components/review/stores/playback-store";
import { useVideoReviewStore } from "@/components/review/stores/video-review-store";

// Shared by every user of the hook, so the newest call supersedes the others.
let latest = 0;

async function queryVideo(videoId: string, revisionId?: string | null) {
    const [videoRes, revisionsRes] = await Promise.all([
        api.videos[":id"].$get({ param: { id: videoId } }),
        api.videos[":id"].revisions.$get({ param: { id: videoId } }),
    ]);

    if (videoRes.status !== 200) {
        throw new Error(await readError(videoRes));
    }

    if (revisionsRes.status !== 200) {
        throw new Error(await readError(revisionsRes));
    }

    const video = await videoRes.json();
    const revisions = await revisionsRes.json();
    const revision = revisions.find((r) => r.id === revisionId) ?? revisions[0] ?? null;
    const comments = revision ? await queryComments(revision) : [];

    return { video, revisions, revision, comments };
}

export function useOpenVideo() {
    const resetSource = usePlayback((s) => s.resetSource);

    return async (videoId: string, revisionId?: string | null) => {
        const mine = ++latest;
        useVideoStore.getState().setOpening(true);

        let opened: Awaited<ReturnType<typeof queryVideo>>;
        try {
            opened = await queryVideo(videoId, revisionId);
        } catch (error) {
            if (mine === latest) {
                useVideoStore.getState().setOpening(false);
                toast.error((error as Error).message);
            }

            return false;
        }

        if (mine !== latest) {
            return false;
        }

        // No await from here on, so the screen changes to the new video in one render.
        useVideoStore.getState().selectVideo(opened.video, opened.revisions, opened.revision);
        useCommentStore.getState().showComments(opened.comments, opened.revision);
        useVideoReviewStore.getState().setSelectComment(null);
        useVideoReviewStore.getState().setActiveComments([]);
        resetSource();

        return true;
    };
}
