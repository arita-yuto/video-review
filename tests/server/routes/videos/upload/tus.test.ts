import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { prisma } from "@/server/lib/db";
import { ServerError } from "@/server/lib/server-error";
import { LocalDriver } from "@/server/lib/storage/drivers/local";

const root = path.join(os.tmpdir(), `videoreview-tus-route-${randomUUID()}`);
fs.mkdirSync(root, { recursive: true });
const driver = new LocalDriver(root);

vi.mock("@/server/lib/token", () => ({ authorize: vi.fn() }));
vi.mock("@/server/lib/storage", () => ({
    VideoReviewStorage: { getDriver: () => driver },
}));

import { authorize } from "@/server/lib/token";
import { tusRouter } from "@/server/routes/videos/upload/tus";
import { TUS_PATH } from "@/server/lib/storage/tus/server";

const payload = Buffer.from(Array.from({ length: 250_000 }, (_, i) => i % 251));
const createdSessionIds: string[] = [];

async function createSession() {
    const id = randomUUID();
    const folderKey = `tus-route-${id.slice(0, 8)}`;
    const title = `Tus Route ${id.slice(0, 8)}`;
    const storageKey = `videos/${folderKey}/${title}/rev_001.mp4`;

    await prisma.uploadSession.create({
        data: { id, title, folderKey, scenePath: null, nextRev: 1, storage: "local", storageKey },
    });
    createdSessionIds.push(id);
    return { id, storageKey };
}

function create(sessionId: string, size: number) {
    return tusRouter.request(`http://localhost${TUS_PATH}`, {
        method: "POST",
        headers: {
            "Tus-Resumable": "1.0.0",
            "Upload-Length": String(size),
            "Upload-Metadata": `sessionId ${Buffer.from(sessionId).toString("base64")}`,
        },
    });
}

beforeEach(() => {
    vi.mocked(authorize).mockResolvedValue({ type: "api-token", role: "admin" } as never);
});

afterAll(async () => {
    await prisma.uploadSession.deleteMany({ where: { id: { in: createdSessionIds } } });
    fs.rmSync(root, { recursive: true, force: true });
});

describe("videos upload tusRouter", () => {
    it("stores a chunked upload under the storage key its session was given", async () => {
        const session = await createSession();

        const created = await create(session.id, payload.length);
        expect(created.status).toBe(201);

        const location = created.headers.get("location")!;
        let offset = 0;
        while (offset < payload.length) {
            const res = await tusRouter.request(location, {
                method: "PATCH",
                headers: {
                    "Tus-Resumable": "1.0.0",
                    "Upload-Offset": String(offset),
                    "Content-Type": "application/offset+octet-stream",
                },
                body: payload.subarray(offset, offset + 90_000),
            });
            expect(res.status).toBe(204);
            offset = Number(res.headers.get("upload-offset"));
        }

        expect(await driver.hasObject(session.storageKey)).toBe(true);
        expect(fs.readFileSync(path.join(root, session.storageKey)).equals(payload)).toBe(true);
    });

    it("refuses a chunk sent at the wrong offset", async () => {
        const session = await createSession();
        const location = (await create(session.id, payload.length)).headers.get("location")!;

        const res = await tusRouter.request(location, {
            method: "PATCH",
            headers: {
                "Tus-Resumable": "1.0.0",
                "Upload-Offset": "777",
                "Content-Type": "application/offset+octet-stream",
            },
            body: payload.subarray(0, 10),
        });

        expect(res.status).toBe(409);
    });

    it("hands back a relative upload URL, so the scheme of the deployment is kept", async () => {
        const session = await createSession();

        const created = await create(session.id, payload.length);

        expect(created.headers.get("location")).toMatch(/^\/api\/v1\/videos\/upload\/tus\//);
    });

    it("answers 404 for an upload that does not exist, instead of a server error", async () => {
        const res = await tusRouter.request(`http://localhost${TUS_PATH}/videos/nothing/here.mp4`, {
            method: "HEAD",
            headers: { "Tus-Resumable": "1.0.0" },
        });

        expect(res.status).toBe(404);
    });

    it("reports a finished upload as complete, so a reconnecting client does not start over", async () => {
        const session = await createSession();
        const location = (await create(session.id, payload.length)).headers.get("location")!;

        await tusRouter.request(location, {
            method: "PATCH",
            headers: {
                "Tus-Resumable": "1.0.0",
                "Upload-Offset": "0",
                "Content-Type": "application/offset+octet-stream",
            },
            body: payload,
        });

        const head = await tusRouter.request(location, {
            method: "HEAD",
            headers: { "Tus-Resumable": "1.0.0" },
        });

        expect(head.status).toBe(200);
        expect(head.headers.get("upload-offset")).toBe(String(payload.length));
    });

    it("rejects an unauthorised chunk on an upload that already exists", async () => {
        const session = await createSession();
        const location = (await create(session.id, payload.length)).headers.get("location")!;

        vi.mocked(authorize).mockRejectedValue(new ServerError("invalid token", 401));

        const res = await tusRouter.request(location, {
            method: "PATCH",
            headers: {
                "Tus-Resumable": "1.0.0",
                "Upload-Offset": "0",
                "Content-Type": "application/offset+octet-stream",
            },
            body: payload.subarray(0, 10),
        });

        expect(res.status).toBe(401);
    });

    it("checks the caller before it looks a session up, so an unauthorised caller learns nothing", async () => {
        vi.mocked(authorize).mockRejectedValue(new ServerError("invalid token", 401));

        const res = await create(randomUUID(), payload.length);

        expect(res.status).toBe(401);
    });

});
