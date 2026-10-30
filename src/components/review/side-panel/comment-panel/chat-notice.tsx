"use client";

import { useCommentStore } from "@/stores/comment-store";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

async function postToChat(commentId: string, screenshot: Blob) {
    const comment = useCommentStore.getState().comments.find(c => c.id === commentId);
    if (!comment) {
        return null;
    }

    const res = await api.chat.index.$post({
        form: {
            baseURL: window.location.origin,
            commentId: comment.id,
            screenshot: new File([screenshot], "screenshot.png"),
        },
    });
    if (res.status !== 200) return null;
    return res.json();
}

export async function chatToast(commentId: string, screenshot: Blob | null): Promise<boolean> {
    if (screenshot === null) {
        return false;
    }
    
    const comment = useCommentStore.getState().comments.find(c => c.id === commentId);
    if (!comment) {
         return false;
    }

    const ret = await postToChat(commentId, screenshot);
    if (!ret || ret.notifiedProviders.length === 0) {
        return false;
    }

    const toastData = ret.toastData;
    toast.custom(() => (
        <div className="flex gap-3 rounded-md border bg-popover p-3 text-popover-foreground shadow-md">
            <img
                src={URL.createObjectURL(screenshot)}
                className="h-16 w-16 rounded object-cover"
            />
            <div className="flex flex-col gap-0.5">
                <div className="text-sm font-semibold">
                    {toastData.title}
                </div>
                <div className="text-xs line-clamp-2">
                    {toastData.comment}
                </div>
            </div>
        </div>
    ));
    const res = await api.comments.index.$patch({
        json: { id: commentId, notifiedProviders: ret.notifiedProviders },
    });
    if (res.status !== 200) throw new Error("Failed to update comment");
    useCommentStore.getState().updateComment(await res.json());
    return true;
}
