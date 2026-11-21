import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { handleServerError } from "@/server/lib/server-error";

const prismaMock = vi.hoisted(() => ({
    video: { findUnique: vi.fn() },
    videoRevision: { findFirst: vi.fn() },
}));

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));

// Keep roleOf real; force the login gate to resolve as a guest.
vi.mock("@/server/lib/token", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/server/lib/token")>();
    const guest = { type: "jwt" as const, decoded: { role: "guest" } };
    return {
        ...actual,
        authorize: vi.fn(async () => guest),
        authorizeMedia: vi.fn(async () => guest),
    };
});

vi.mock("@/server/lib/storage", () => ({
    VideoReviewStorage: {
        getDriver: () => ({
            type: () => "local",
            localBaseDirectory: "/tmp/vr-guest-enforcement-root",
        }),
    },
}));

import { getVideoRouter } from "@/server/routes/videos/[id]/get-video";
import { localRouter } from "@/server/routes/media/local";
import { resolverRouter } from "@/server/routes/media/resolver";

function mount(router: OpenAPIHono, base: string) {
    const app = new OpenAPIHono().route(base, router);
    app.onError(handleServerError);
    return app;
}

describe("guest metadata enforcement", () => {
    beforeEach(() => {
        prismaMock.video.findUnique.mockReset();
    });

    it("returns 403 for a guest on a non-visible video", async () => {
        prismaMock.video.findUnique.mockResolvedValue({ guestVisible: false });
        const res = await mount(getVideoRouter, "/videos/:id").request("http://localhost/videos/vid-1");
        expect(res.status).toBe(403);
    });

    it("serves a guest-visible video to a guest", async () => {
        prismaMock.video.findUnique.mockResolvedValue({ id: "vid-1", guestVisible: true, revisions: [] });
        const res = await mount(getVideoRouter, "/videos/:id").request("http://localhost/videos/vid-1");
        expect(res.status).toBe(200);
    });
});

describe("guest media enforcement", () => {
    beforeEach(() => {
        prismaMock.video.findUnique.mockReset();
    });

    it("returns 403 for a guest on a non-visible video's media", async () => {
        prismaMock.video.findUnique.mockResolvedValue({ guestVisible: false });
        const res = await mount(localRouter, "/media").request("http://localhost/media/thumbnails/vid-1/thumb.png");
        expect(res.status).toBe(403);
    });

    it("passes the guest gate for a guest-visible video's media", async () => {
        prismaMock.video.findUnique.mockResolvedValue({ guestVisible: true });
        const res = await mount(localRouter, "/media").request("http://localhost/media/thumbnails/vid-1/thumb.png");
        // The file does not exist on disk, so a 404 (not 403) proves the guest gate let it through.
        expect(res.status).not.toBe(403);
    });

    it("returns 403 for a guest on a non-visible video's resolved URL", async () => {
        prismaMock.video.findUnique.mockResolvedValue({ guestVisible: false });
        const res = await mount(resolverRouter, "/resolver").request("http://localhost/resolver/thumbnails/vid-1/thumb.png");

        expect(res.status).toBe(403);
        expect(prismaMock.video.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "vid-1" } }));
    });
});
