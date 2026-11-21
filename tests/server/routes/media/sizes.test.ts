import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { OpenAPIHono } from "@hono/zod-openapi";

import { handleServerError, ServerError } from "@/server/lib/server-error";
import { LocalDriver } from "@/server/lib/storage/drivers/local";

const root = path.join(os.tmpdir(), `videoreview-sizes-route-${randomUUID()}`);
const driver = new LocalDriver(root);

vi.mock("@/server/lib/token", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/server/lib/token")>();
    return { ...actual, authorize: vi.fn() };
});

vi.mock("@/server/lib/storage", () => ({
    VideoReviewStorage: { objectSize: (storageKey: string) => driver.objectSize(storageKey) },
}));

vi.mock("@/server/lib/integrations/general", () => ({
    getResolutionPresets: async () => [480, 720, 1080],
}));

import { authorize } from "@/server/lib/token";
import { sizesRouter } from "@/server/routes/media/sizes";

const app = new OpenAPIHono();
app.route("/sizes", sizesRouter);
app.onError(handleServerError);

function writeFile(storageKey: string, bytes: number) {
    return fs.promises.writeFile(path.join(root, storageKey), Buffer.alloc(bytes));
}

describe("media sizesRouter", () => {
    beforeAll(async () => {
        await fs.promises.mkdir(path.join(root, "videos/demo"), { recursive: true });
        await writeFile("videos/demo/rev_001.mp4", 5000);
        await writeFile("videos/demo/rev_001_1080p.mp4", 3000);
        await writeFile("videos/demo/rev_001_480p.mp4", 1000);
        await writeFile("videos/demo/rev_002_720p.mp4", 2000);
    });

    beforeEach(() => {
        vi.mocked(authorize).mockResolvedValue({ type: "api-token", role: "admin" } as never);
    });

    afterAll(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    it("answers the original's size and the size of each downscaled file that exists", async () => {
        const res = await app.request("http://localhost/sizes/videos/demo/rev_001.mp4");

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({
            original: 5000,
            downscaled: [
                { width: 480, size: 1000 },
                { width: 1080, size: 3000 },
            ],
        });
    });

    it("answers a null original when only a downscaled file exists", async () => {
        const res = await app.request("http://localhost/sizes/videos/demo/rev_002.mp4");

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ original: null, downscaled: [{ width: 720, size: 2000 }] });
    });

    it("rejects a .. segment in the path", async () => {
        // Encoded slashes keep the "../" out of URL normalization, so it reaches the handler.
        const res = await app.request("http://localhost/sizes/videos/demo%2f%2e%2e%2fother%2frev_001.mp4");

        expect(res.status).toBe(400);
    });

    it("answers 401 without a credential", async () => {
        vi.mocked(authorize).mockRejectedValueOnce(new ServerError("unauthorized", 401));

        const res = await app.request("http://localhost/sizes/videos/demo/rev_001.mp4");

        expect(res.status).toBe(401);
    });
});
