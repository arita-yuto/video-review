import { createRouter } from "@/server/lib/openapi/router";
import { getVideoRouter } from "@/server/routes/videos/[id]/get-video";
import { latestRouter } from "@/server/routes/videos/[id]/latest";
import { revisionsRouter } from "@/server/routes/videos/[id]/revisions";
import { metaDataRouter } from "@/server/routes/videos/[id]/metadata";
import { eventsRouter } from "@/server/routes/videos/[id]/events";
import { vcsRouter } from "@/server/routes/videos/[id]/vcs";
import { patchVideoRouter } from "@/server/routes/videos/[id]/patch";
import { streamRouter } from "@/server/routes/videos/[id]/stream";
import { syncRouter } from "@/server/routes/videos/[id]/sync";
import { issueStatusRouter } from "@/server/routes/videos/[id]/issue-status";

export const videoByIdRouter = createRouter()
    .route("/", getVideoRouter)
    .route("/", patchVideoRouter)
    .route("/", vcsRouter)
    .route("/latest", latestRouter)
    .route("/revisions", revisionsRouter)
    .route("/events", eventsRouter)
    .route("/metadata", metaDataRouter)
    .route("/stream", streamRouter)
    .route("/sync", syncRouter)
    .route("/issue-status", issueStatusRouter);
