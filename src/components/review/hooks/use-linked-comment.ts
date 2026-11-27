import { toast } from "sonner";
import { api, readError } from "@/api";
import { usePlayback } from "@/components/review/stores/playback-store";
import { useVideoReviewStore } from "@/components/review/stores/video-review-store";

export function useLinkedComment() {
    const setTimelineTime = usePlayback((s) => s.setTimelineTime);
    const setSelectComment = useVideoReviewStore((s) => s.setSelectComment);

    const selectLinkedComment = async (commentId: string) => {
        const res = await api.comments[":id"].$get({ param: { id: commentId } });

        if (res.status !== 200) {
            throw new Error(await readError(res));
        }

        const comment = await res.json();

        setTimelineTime(comment.time);
        setSelectComment(comment, "link");
    };

    return (commentId: string) => {
        void selectLinkedComment(commentId).catch((error: Error) => {
            toast.error(error.message);
        });
    };
}
