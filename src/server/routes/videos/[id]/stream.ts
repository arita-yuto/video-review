import { randomUUID } from "node:crypto";
import { createRoute } from "@hono/zod-openapi";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorizeVideo, authorizeVideoMedia } from "@/server/lib/videos/guest-access";
import type { AuthIdentity } from "@/server/lib/token";
import { prisma } from "@/server/lib/db";
import { subscribeVideoStream, touchVideoStream, type Participant } from "@/server/lib/video-stream";

async function participantOf(auth: AuthIdentity): Promise<Participant> {
    if (auth.type !== "jwt") {
        return { name: "API token", email: null };
    }

    // A guest has no user row; its name lives only in the token.
    const { id, displayName, provider } = auth.decoded;
    if (provider === "guest") {
        return { name: String(displayName), email: null };
    }

    // The row rather than the token, so a renamed user shows the new name.
    const user = await prisma.user.findUnique({ where: { id }, select: { displayName: true, email: true } });
    return { name: user?.displayName ?? String(displayName), email: user?.email ?? null };
}

export const streamRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Stream updates for one video",
        description: [
            "Server-sent events while a review screen has the video open. `sync=1` puts this connection in the video's sync session.",
            "- `hello`: first, with the connection id the browser pings with.",
            "- `sync`: the session's participants, playback state, presenter and requester.",
            "- `comments`: the video's comments changed; fetch them again.",
        ].join("\n"),
        path: "/",
        request: {
            query: z.object({
                sync: z.enum(["1"]).optional(),
            }),
        },
        responses: {
            200: {
                description: "Event stream",
                content: {
                    "text/event-stream": {
                        schema: z.string(),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        const id = c.req.param("id") as string;
        const auth = await authorizeVideoMedia(c, ["guest", "viewer", "admin"], id);
        const participant = c.req.valid("query").sync === "1" ? await participantOf(auth) : null;

        return streamSSE(c, async (stream) => {
            const connectionId = randomUUID();
            await stream.writeSSE({ event: "hello", data: JSON.stringify({ connectionId }) });
            if (stream.aborted) {
                return;
            }

            // Open until the browser closes it or the patrol in video-stream finds it stopped pinging.
            await new Promise<void>((closed) => {
                const unsubscribe = subscribeVideoStream(id, connectionId, participant, {
                    send: (event, data) => {
                        void stream.writeSSE({ event, data: JSON.stringify(data) });
                    },
                    keepAlive: () => {
                        void stream.write(": keepalive\n\n");
                    },
                    close: closed,
                });
                stream.onAbort(() => {
                    unsubscribe();
                    closed();
                });
            });
        });
    })
    .openapi(createRoute({
        method: "post",
        summary: "Keep a video stream alive",
        description: "Sent by the browser every 20 seconds with the id from `hello`. A stream without pings for 90 seconds is closed and leaves the sync session.",
        path: "/ping",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: z.object({ connectionId: z.string().min(1) }),
                    },
                },
            },
        },
        responses: {
            204: { description: "Still open" },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: errorResponse("The server no longer has this connection"),
        },
    }), async (c) => {
        const id = c.req.param("id") as string;
        await authorizeVideo(c.req.raw, ["guest", "viewer", "admin"], id);

        if (!touchVideoStream(id, c.req.valid("json").connectionId)) {
            return c.json({ error: "unknown connection" }, 404);
        }
        return c.body(null, 204);
    });
