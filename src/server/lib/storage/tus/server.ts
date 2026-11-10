import { Server } from "@tus/server";
import { MemoryLocker } from "@tus/server";
import { FileKvStore, type Upload } from "@tus/utils";

import { prisma } from "@/server/lib/db";
import { ServerError } from "@/server/lib/server-error";
import { VideoReviewStorage } from "@/server/lib/storage";
import { LocalDriver } from "@/server/lib/storage/drivers/local";
import { NextCloudDriver } from "@/server/lib/storage/drivers/nextcloud";
import { LocalTusStore } from "@/server/lib/storage/tus/local-store";
import { NextcloudKvStore } from "@/server/lib/storage/tus/nextcloud-kv-store";
import { NextcloudTusStore } from "@/server/lib/storage/tus/nextcloud-store";
import { authorize } from "@/server/lib/token";

import "server-only";

export const TUS_PATH = "/api/v1/videos/upload/tus";

let server: Server | undefined;

/**
 * The tus server for chunked video uploads. s3 is not served this way: it hands the browser a
 * presigned URL that never reaches us, so there is no upload limit of ours to get under.
 */
export function tusServer(): Server {
    if (server) {
        return server;
    }

    server = new Server({
        path: TUS_PATH,
        datastore: datastoreForCurrentDriver(),
        locker: new MemoryLocker(),
        namingFunction: storageKeyOfSession,
        // The upload URL stays a path. Built as an absolute URL it would carry a guessed
        // scheme, and guessing http on an https deployment blocks every chunk that follows.
        // The id holds a video title, so it is escaped for the URL.
        generateUrl: (_req, { path, id }) => `${path}/${encodeURIComponent(id)}`,
        getFileIdFromRequest,
        onIncomingRequest: authorizeUpload,
        // A thrown ServerError carries its status on `status`, which the tus server does not
        // read, so without this mapping every refusal would be answered as a 500.
        onResponseError: (req, error) => {
            console.error(`${req.method} ${new URL(req.url).pathname} failed:`, error);

            if (error instanceof ServerError) {
                return { status_code: error.status, body: error.message };
            }
        },
    });

    return server;
}

function datastoreForCurrentDriver() {
    const driver = VideoReviewStorage.getDriver();

    if (driver instanceof LocalDriver) {
        if (!driver.localBaseDirectory) {
            throw new ServerError("local storage has no root directory configured", 500);
        }
        return new LocalTusStore(driver, new FileKvStore<Upload>(driver.localBaseDirectory));
    }

    if (driver instanceof NextCloudDriver) {
        return new NextcloudTusStore(driver, new NextcloudKvStore(driver));
    }

    throw new ServerError("chunked upload is not available for this storage", 501);
}

async function authorizeUpload(req: Request): Promise<void> {
    await authorize(req, ["admin"]);
}

/**
 * The client names the upload session it was given by init; where those bytes are stored is
 * read from that session, never from the request.
 *
 * The tus server resolves the name before it runs the incoming-request hook, so this checks
 * the caller itself rather than letting an unauthenticated request reach the database.
 */
async function storageKeyOfSession(req: Request, metadata?: Record<string, string | null>): Promise<string> {
    await authorizeUpload(req);

    const sessionId = metadata?.sessionId;
    if (!sessionId) {
        throw { status_code: 400, body: "missing sessionId metadata" };
    }

    const session = await prisma.uploadSession.findUnique({ where: { id: sessionId } });
    if (!session) {
        throw { status_code: 400, body: "missing session" };
    }

    return session.storageKey;
}

function getFileIdFromRequest(req: Request): string | undefined {
    const { pathname } = new URL(req.url);
    const id = pathname.slice(pathname.indexOf(TUS_PATH) + TUS_PATH.length).replace(/^\//, "");
    if (!id) {
        return undefined;
    }

    try {
        return decodeURIComponent(id);
    } catch {
        // A title can put a stray "%" in the key; an undecodable id is simply not one of ours.
        return undefined;
    }
}
