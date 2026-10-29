import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
    videoComment: {
        findMany: vi.fn(async (_args: { where: { videoRevNum?: unknown } }) => []),
    },
    videoRevision: {
        findMany: vi.fn(async () => [{ revision: 3 }, { revision: 5 }, { revision: 6 }]),
    },
}));
const authorizeMock = vi.hoisted(() => vi.fn(async () => ({ type: "jwt" as const, decoded: { id: "viewer-1", role: "viewer" } })));

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/server/lib/token")>()),
    authorize: authorizeMock,
}));
vi.mock("@/server/lib/storage", () => ({ VideoReviewStorage: { deleteObject: vi.fn(async () => true) } }));

import { OpenAPIHono } from "@hono/zod-openapi";
import { commentsRouter } from "@/server/routes/comments";

const app = new OpenAPIHono().route("/", commentsRouter);

function list(query: Record<string, string>) {
    return app.request("http://localhost/?" + new URLSearchParams({ videoId: "video-1", ...query }));
}

function revisionCondition() {
    return prismaMock.videoComment.findMany.mock.calls[0][0].where.videoRevNum;
}

describe("comment list by revision", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns every live revision when none is named", async () => {
        const res = await list({});

        expect(res.status).toBe(200);
        expect(revisionCondition()).toEqual({ in: [3, 5, 6], gte: undefined, lte: undefined });
    });

    it("keeps a revision range to its two ends", async () => {
        const res = await list({ revisionFrom: "3", revisionTo: "5" });

        expect(res.status).toBe(200);
        expect(revisionCondition()).toEqual({ in: [3, 5, 6], gte: 3, lte: 5 });
    });

    it("names one revision as is, purged or not", async () => {
        const res = await list({ selectRevision: "4" });

        expect(res.status).toBe(200);
        expect(revisionCondition()).toBe(4);
        expect(prismaMock.videoRevision.findMany).not.toHaveBeenCalled();
    });

    it("rejects a revision that is not a number", async () => {
        const res = await list({ revisionFrom: "abc" });

        expect(res.status).toBe(400);
    });
});
