import "server-only";
import { prisma } from "@/server/lib/db";
import { ServerError } from "@/server/lib/server-error";
import type { Context } from "hono";
import { authorize, authorizeMedia, roleOf, type AuthIdentity } from "@/server/lib/token";
import type { VideoComment } from "@prisma/client";
import type { Role } from "@/lib/role";

// Media is served by opaque storage key, so guest checks first map a key back to its video.
export async function videoIdForStorageKey(key: string): Promise<string | null> {
    const segments = key.split("/");

    // Thumbnails are stored under "thumbnails/<videoId>/...".
    if (segments[0] === "thumbnails") {
        return segments[1] ?? null;
    }

    // Revision variants append "_<width>p" before the extension; match against the stored base path.
    const base = key.replace(/_\d+p(\.[^./]+)$/, "$1");
    // Filmstrip sheets append "_strip_<n>.jpg" to the base path, whatever the source's extension was.
    const stripBase = key.match(/^(.*)_strip_\d+\.jpg$/)?.[1];
    const revision = await prisma.videoRevision.findFirst({
        where: stripBase ? { filePath: { startsWith: `${stripBase}.` } } : { filePath: { in: [base, key] } },
        select: { videoId: true },
    });
    if (revision) return revision.videoId;

    // A drawing is stored per comment, so reach its video through the comment.
    const comment = await prisma.videoComment.findFirst({
        where: { drawingPath: key },
        select: { videoId: true },
    });
    return comment?.videoId ?? null;
}

export async function assertRoleCanSeeVideo(videoId: string, role: Role): Promise<void> {
    if (role !== "guest") return;

    const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { guestVisible: true },
    });
    if (!video?.guestVisible) {
        throw new ServerError("forbidden", 403);
    }
}

// The role gate and the guest flag in one call; lint keeps guest-admitting routes about one video on it.
export async function authorizeVideo(req: Request, roles: Role[], videoId: string): Promise<AuthIdentity> {
    const auth = await authorize(req, roles);
    await assertRoleCanSeeVideo(videoId, roleOf(auth));
    return auth;
}

// authorizeVideo for a route the browser reaches without a bearer header (EventSource), so the login cookie counts.
export async function authorizeVideoMedia(c: Context, roles: Role[], videoId: string): Promise<AuthIdentity> {
    const auth = await authorizeMedia(c, roles);
    await assertRoleCanSeeVideo(videoId, roleOf(auth));
    return auth;
}

// Same for a route about one comment; a missing comment is a 404.
export async function authorizeComment(req: Request, roles: Role[], commentId: string): Promise<{ auth: AuthIdentity; comment: VideoComment }> {
    const auth = await authorize(req, roles);
    const comment = await prisma.videoComment.findUnique({ where: { id: commentId } });
    if (!comment) {
        throw new ServerError("comment not found", 404);
    }
    await assertRoleCanSeeVideo(comment.videoId, roleOf(auth));
    return { auth, comment };
}
