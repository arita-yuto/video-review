import { hc } from "hono/client";
import type { Hono } from "hono";
import type { mediaRouter } from "@/server/routes/media";
import type { readStatusRouter } from "@/server/routes/read-status";
import type { commentsRouter } from "@/server/routes/comments";
import type { authRouter } from "@/server/routes/auth";
import type { adminRouter } from "@/server/routes/admin";
import type { videosRouter } from "@/server/routes/videos";
import type { drawingRouter } from "@/server/routes/drawing";
import type { uploadStatusRouter } from "@/server/routes/upload-status";
import type { avatarRouter } from "@/server/routes/avatar";
import type { userRouter } from "@/server/routes/user";
import type { chatRouter } from "@/server/routes/chat";
import type { chatSearchRouter } from "@/server/routes/chat/search";
import type { thumbnailRouter } from "@/server/routes/thumbnail";
import type { configRouter } from "@/server/routes/config";
import { useAuthStore } from "@/stores/auth-store";

const options = {
    headers: (): Record<string, string> => {
        const token = useAuthStore.getState().token;
        return token ? { Authorization: `Bearer ${token}` } : {};
    },
};

const v1 = <T extends Hono<any, any, any>>(path: string) => hc<T>(`/api/v1${path}`, options);

// One client per router, mirroring the mounts in src/server/routes/v1.ts. The routers are
// imported as types only, so nothing from the server bundle reaches the client. Typing a single
// client against the whole v1 tree is too deep for the compiler and collapses to unknown.
export const api = {
    media: v1<typeof mediaRouter>("/media"),
    readStatus: v1<typeof readStatusRouter>("/read-status"),
    comments: v1<typeof commentsRouter>("/comments"),
    auth: v1<typeof authRouter>("/auth"),
    admin: v1<typeof adminRouter>("/admin"),
    videos: v1<typeof videosRouter>("/videos"),
    drawing: v1<typeof drawingRouter>("/drawing"),
    uploadStatus: v1<typeof uploadStatusRouter>("/upload-status"),
    avatar: v1<typeof avatarRouter>("/avatar"),
    user: v1<typeof userRouter>("/user"),
    chat: v1<typeof chatRouter>("/chat"),
    chatSearch: v1<typeof chatSearchRouter>("/chat/search"),
    thumbnail: v1<typeof thumbnailRouter>("/thumbnail"),
    config: v1<typeof configRouter>("/config"),
};

// Takes a structural type because error routes declare no content schema, which types their
// json() as never. An error body is not guaranteed to be JSON either (a proxy can answer with
// HTML), so fall back to the status code instead of letting the parse throw.
export async function readError(res: { status: number; json: () => Promise<unknown> }): Promise<string> {
    try {
        const body = await res.json() as { error?: string } | null;
        return body?.error ?? `HTTP ${res.status}`;
    } catch {
        return `HTTP ${res.status}`;
    }
}
