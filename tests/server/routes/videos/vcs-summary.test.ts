import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { videoByIdRouter } from "@/server/routes/videos/[id]";
import { createLLMClient } from "@/server/lib/integration-clients/llm-client";

// createLLMClient reads the saved settings, so the module is mocked and each test sets its result.
vi.mock("@/server/lib/integration-clients/llm-client", () => ({
    createLLMClient: vi.fn(),
}));

vi.mock("@/server/lib/token", async (importOriginal) => {
    const { withAuthorizePass } = await import("../../../mocks/authorize");
    return withAuthorizePass(await importOriginal<typeof import("@/server/lib/token")>());
});

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_REPO = "github:org/summary-test-repo";

const createdVideoIds: string[] = [];
const createdRevisionIds: string[] = [];
const createdVCSConfigIds: string[] = [];
const createdLinkIds: string[] = [];
const createdCachedMergeIds: string[] = [];

async function createTestVideo() {
    const videoId = randomUUID();
    const rev1Id = randomUUID();
    const rev2Id = randomUUID();

    await prisma.video.create({
        data: { id: videoId, title: "CutScene Opening Test", folderKey: "vcs-summary-test" },
    });
    await prisma.videoRevision.create({
        data: { id: rev1Id, videoId, revision: 1, filePath: "test/rev1.mp4", uploadedAt: new Date("2026-03-10T09:00:00Z") },
    });
    await prisma.videoRevision.create({
        data: { id: rev2Id, videoId, revision: 2, filePath: "test/rev2.mp4", uploadedAt: new Date("2026-03-20T15:00:00Z") },
    });
    await prisma.video.update({ where: { id: videoId }, data: { latestRevisionNum: 2 } });

    createdVideoIds.push(videoId);
    createdRevisionIds.push(rev1Id, rev2Id);
    return { videoId, rev1Id, rev2Id };
}

type SeedPR = {
    id: string;
    title: string;
    description: string | null;
    author: string;
    mergedAt: Date;
    url: string;
    labels: string[];
    relevance: string;
    relevanceReason: string;
};

async function seedCachedChangeSet(rev2Id: string, opts: {
    prs?: SeedPR[];
    summary?: string | null;
} = {}) {
    const prs: SeedPR[] = opts.prs ?? [
        {
            id: "142",
            title: "Fix camera shake in cutscene",
            description: "Stabilized camera rig during cutscene transitions",
            author: "yamada",
            mergedAt: new Date("2026-03-15T11:20:00Z"),
            url: "https://github.com/org/repo/pull/142",
            labels: ["bug", "camera"],
            relevance: "high",
            relevanceReason: "vcsWatchPaths match: Assets/Scripts/Camera/Shake.cs",
        },
        {
            id: "138",
            title: "CutScene timing adjustment",
            description: null,
            author: "sato",
            mergedAt: new Date("2026-03-12T09:00:00Z"),
            url: "https://github.com/org/repo/pull/138",
            labels: ["feature"],
            relevance: "maybe",
            relevanceReason: "title keyword match",
        },
    ];

    const config = await prisma.vCSConfig.create({
        data: { label: "mock-github", provider: "github", config: {}, branch: "main" },
    });
    createdVCSConfigIds.push(config.id);

    // Create VCSCachedMerge entries and build mergeResults
    const mergeResults: { cachedMergeId: string; relevance: string; relevanceReason: string }[] = [];
    for (const pr of prs) {
        const cached = await prisma.vCSCachedMerge.upsert({
            where: { externalId_repoName: { externalId: pr.id, repoName: TEST_REPO } },
            create: {
                externalId: pr.id,
                repoName: TEST_REPO,
                title: pr.title,
                description: pr.description,
                author: pr.author,
                mergedAt: pr.mergedAt,
                url: pr.url,
                labels: pr.labels,
                files: [],
                filesFetchedAt: new Date(),
            },
            update: {},
        });
        createdCachedMergeIds.push(cached.id);
        mergeResults.push({ cachedMergeId: cached.id, relevance: pr.relevance, relevanceReason: pr.relevanceReason });
    }

    const link = await prisma.vCSRevisionLink.create({
        data: {
            videoRevisionId: rev2Id,
            vcsConfigId: config.id,
            rangeFrom: new Date("2026-03-10T09:00:00Z"),
            rangeTo: new Date("2026-03-20T15:00:00Z"),
            mergeResults: mergeResults as object[],
            commitResults: [],
            summary: opts.summary !== undefined ? opts.summary : null,
            fetchedAt: new Date(),
        },
    });
    createdLinkIds.push(link.id);
    return { config, link };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("GET /videos/:id/vcs-summary", () => {
    const app = new Hono();
    app.route("/videos/:id", videoByIdRouter);

    afterAll(async () => {
        await prisma.vCSRevisionLink.deleteMany({ where: { id: { in: createdLinkIds } } });
        await prisma.vCSConfig.deleteMany({ where: { id: { in: createdVCSConfigIds } } });
        await prisma.vCSCachedMerge.deleteMany({ where: { id: { in: createdCachedMergeIds } } });
        await prisma.video.updateMany({ where: { id: { in: createdVideoIds } }, data: { latestRevisionNum: null } });
        await prisma.videoRevision.deleteMany({ where: { id: { in: createdRevisionIds } } });
        await prisma.video.deleteMany({ where: { id: { in: createdVideoIds } } });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // -----------------------------------------------------------------------
    // Error cases
    // -----------------------------------------------------------------------

    describe("error cases", () => {
        it("returns 503 when LLM is not configured", async () => {
            const { videoId, rev2Id } = await createTestVideo();
            await seedCachedChangeSet(rev2Id);

            vi.mocked(createLLMClient).mockResolvedValue(null);

            const res = await app.request(`http://localhost/videos/${videoId}/vcs-summary`);
            expect(res.status).toBe(503);
        });

        it("returns 404 when no cached vcs-changes exist", async () => {
            const { videoId } = await createTestVideo();

            vi.mocked(createLLMClient).mockResolvedValue({ complete: vi.fn(), completeWithMCP: vi.fn() });

            const res = await app.request(`http://localhost/videos/${videoId}/vcs-summary`);
            expect(res.status).toBe(404);
        });

        it("returns 404 for unknown video id", async () => {
            vi.mocked(createLLMClient).mockResolvedValue({ complete: vi.fn(), completeWithMCP: vi.fn() });

            const res = await app.request(`http://localhost/videos/${randomUUID()}/vcs-summary`);
            expect(res.status).toBe(404);
        });
    });

    // -----------------------------------------------------------------------
    // With mocked LLM client
    // -----------------------------------------------------------------------

    describe("with mocked LLM", () => {
        it("generates summary via LLM and persists it to DB", async () => {
            const { videoId, rev2Id } = await createTestVideo();
            const { link } = await seedCachedChangeSet(rev2Id);

            const mockSummary = "Camera shake fix and cutscene timing adjustment may affect video quality.";
            const completeSpy = vi.fn(async () => mockSummary);
            vi.mocked(createLLMClient).mockResolvedValue({ complete: completeSpy, completeWithMCP: vi.fn() });

            const res = await app.request(`http://localhost/videos/${videoId}/vcs-summary?to=${rev2Id}`);
            expect(res.status).toBe(200);

            const body = await res.json() as { summary: string; fromCache: boolean };
            expect(body.summary).toBe(mockSummary);
            expect(body.fromCache).toBe(false);
            expect(completeSpy).toHaveBeenCalledOnce();

            const updated = await prisma.vCSRevisionLink.findUnique({ where: { id: link.id } });
            expect(updated?.summary).toBe(mockSummary);
        });

        it("returns cached summary without calling LLM", async () => {
            const { videoId, rev2Id } = await createTestVideo();
            await seedCachedChangeSet(rev2Id, { summary: "Previously cached summary." });

            const completeSpy = vi.fn();
            vi.mocked(createLLMClient).mockResolvedValue({ complete: completeSpy, completeWithMCP: vi.fn() });

            const res = await app.request(`http://localhost/videos/${videoId}/vcs-summary?to=${rev2Id}`);
            expect(res.status).toBe(200);

            const body = await res.json() as { summary: string; fromCache: boolean };
            expect(body.summary).toBe("Previously cached summary.");
            expect(body.fromCache).toBe(true);
            expect(completeSpy).not.toHaveBeenCalled();
        });

        it("returns summary:null when all PRs are unlikely (no LLM call)", async () => {
            const { videoId, rev2Id } = await createTestVideo();
            await seedCachedChangeSet(rev2Id, {
                prs: [{
                    id: "99",
                    title: "Fix login session timeout",
                    description: null,
                    author: "nakamura",
                    mergedAt: new Date("2026-03-12T09:00:00Z"),
                    url: "https://github.com/org/repo/pull/99",
                    labels: [],
                    relevance: "unlikely",
                    relevanceReason: "no vcsWatchPaths match",
                }],
            });

            const completeSpy = vi.fn();
            vi.mocked(createLLMClient).mockResolvedValue({ complete: completeSpy, completeWithMCP: vi.fn() });

            const res = await app.request(`http://localhost/videos/${videoId}/vcs-summary?to=${rev2Id}`);
            expect(res.status).toBe(200);

            const body = await res.json() as { summary: null; fromCache: boolean };
            expect(body.summary).toBeNull();
            expect(completeSpy).not.toHaveBeenCalled();
        });

        it("passes Accept-Language header as language hint into the prompt", async () => {
            const { videoId, rev2Id } = await createTestVideo();
            await seedCachedChangeSet(rev2Id);

            const completeSpy = vi.fn(async () => "summary text");
            vi.mocked(createLLMClient).mockResolvedValue({ complete: completeSpy, completeWithMCP: vi.fn() });

            await app.request(`http://localhost/videos/${videoId}/vcs-summary?to=${rev2Id}`, {
                headers: { "accept-language": "ja,en;q=0.9" },
            });

            expect(completeSpy).toHaveBeenCalledOnce();
            const calls = completeSpy.mock.calls as unknown as [[string]];
            const prompt = calls[0][0];
            expect(prompt).toContain("ja");
        });
    });
});
