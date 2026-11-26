import type { JSONParsed } from "hono/utils/types";
import type * as Row from "@prisma/client";

// Entities as the browser receives them: Prisma rows after JSON serialisation, so
// Date columns are ISO strings. This is also what the RPC client's res.json() yields.
export type Video = JSONParsed<Row.Video>;
export type VideoRevision = JSONParsed<Row.VideoRevision>;
export type UploadSession = JSONParsed<Row.UploadSession>;
export type User = JSONParsed<Row.User>;
export type UserVideoReadStatus = JSONParsed<Row.UserVideoReadStatus>;
export type Identity = JSONParsed<Row.Identity>;
export type VideoComment = JSONParsed<Row.VideoComment> & {
    reactions: { kind: string; userId: string; userName: string; userEmail: string | null }[];
};
export type VideoEvent = JSONParsed<Row.VideoEvent>;
export type VideoEventKind = JSONParsed<Row.VideoEventKind>;

export { UploadStorageType } from "@prisma/client";
export { Prisma as PrismaTypes } from "@prisma/client";
export type VideoWithRevision = Video & {
  latestRevision: Pick<VideoRevision, "revision" | "uploadedAt" | "tags" | "filePath"> | null;
};

// What the video list adds for includeRevisions=true, so only ask for this type with the flag.
export type VideoWithRevisionList = VideoWithRevision & {
  revisions: VideoRevision[];
};

export type VideoEventLink = { label?: string; url: string };

export type VideoEventWithKind = Omit<VideoEvent, "links"> & {
    kind: Pick<VideoEventKind, "label">;
    links: VideoEventLink[];
};
