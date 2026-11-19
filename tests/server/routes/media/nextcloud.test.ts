import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import http from "node:http";

import { NextCloudDriver } from "@/server/lib/storage/drivers/nextcloud";

const storage = vi.hoisted(() => ({ driver: undefined as unknown }));

vi.mock("@/server/lib/token", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/server/lib/token")>();
    return {
        ...actual,
        authorizeMedia: vi.fn(async () => ({ type: "api-token" as const, role: "admin" as const })),
    };
});

vi.mock("@/server/lib/storage", () => ({
    VideoReviewStorage: {
        getDriver: () => storage.driver,
    },
}));

import { nextCloudRouter } from "@/server/routes/media/nextcloud";

const userName = "admin";
const password = "secret";
const rootPath = "video-review";
const storageKey = "videos/projectA/scene01/rev_001.mp4";
const payload = Buffer.from(Array.from({ length: 600 }, (_, i) => i % 251));

interface ReceivedGet {
    path: string;
    authorization?: string;
    range?: string;
}

class StubNextcloud {
    readonly files = new Map<string, Buffer>();
    readonly received: ReceivedGet[] = [];
    private server?: http.Server;

    async start(): Promise<string> {
        this.server = http.createServer((req, res) => {
            const url = new URL(req.url!, "http://stub");

            switch (req.method) {
                case "MKCOL":
                    res.writeHead(url.pathname.includes("/files/") ? 405 : 201).end();
                    return;

                case "GET": {
                    this.received.push({
                        path: url.pathname,
                        authorization: req.headers["authorization"],
                        range: req.headers["range"],
                    });

                    const stored = this.files.get(url.pathname);

                    if (!stored) {
                        res.writeHead(404).end();
                        return;
                    }

                    const range = /^bytes=(\d+)-(\d+)$/.exec(req.headers["range"] ?? "");

                    if (!range) {
                        res.writeHead(200, { "content-length": String(stored.length) }).end(stored);
                        return;
                    }

                    const start = Number(range[1]);
                    const end = Number(range[2]);
                    const part = stored.subarray(start, end + 1);

                    res.writeHead(206, {
                        "content-length": String(part.length),
                        "content-range": `bytes ${start}-${end}/${stored.length}`,
                    }).end(part);
                    return;
                }

                default:
                    res.writeHead(404).end();
            }
        });

        await new Promise<void>((resolve) => this.server!.listen(0, resolve));
        const { port } = this.server!.address() as { port: number };
        return `http://127.0.0.1:${port}`;
    }

    stop() {
        this.server?.close();
    }
}

let stub: StubNextcloud;

beforeAll(async () => {
    stub = new StubNextcloud();
    const baseURL = await stub.start();

    stub.files.set(`/remote.php/dav/files/${userName}/${rootPath}/${storageKey}`, payload);
    storage.driver = new NextCloudDriver(baseURL, userName, password, rootPath);
});

afterAll(() => stub.stop());

describe("media nextCloudRouter", () => {
    it("serves the requested byte range of a file stored in Nextcloud", async () => {
        const res = await nextCloudRouter.request(`http://localhost/${storageKey}`, {
            headers: { Range: "bytes=100-199" },
        });
        const body = Buffer.from(await res.arrayBuffer());

        expect(res.status).toBe(206);
        expect(res.headers.get("Content-Range")).toBe(`bytes 100-199/${payload.length}`);
        expect(body.equals(payload.subarray(100, 200))).toBe(true);

        expect(stub.received).toEqual([
            {
                path: `/remote.php/dav/files/${userName}/${rootPath}/${storageKey}`,
                authorization: `Basic ${Buffer.from(`${userName}:${password}`).toString("base64")}`,
                range: "bytes=100-199",
            },
        ]);
    });
});
