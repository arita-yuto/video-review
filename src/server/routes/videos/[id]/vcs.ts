import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { prisma } from "@/server/lib/db";
import { createVCSProviderFromEnv } from "@/server/lib/vcs/from-env";
import type { Relevance, PullRequest, Commit } from "@/server/lib/vcs/types";
import { scoreRelevance } from "@/server/lib/vcs/relevance";
import { startOfUTCDay, ensureDaysCached, queryByDateRange } from "@/server/lib/vcs/cache";
import { createLLMClient } from "@/server/lib/integration-clients/llm-client";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize, roleOf } from "@/server/lib/token";
import { assertRoleCanSeeVideo } from "@/server/lib/videos/guest-access";

const DEFAULT_LOOKBACK_DAYS = 30;

const QueryVcsChangesSchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    refresh: z.string().transform(v => v === "true").optional(),
});

const QueryVcsSummarySchema = z.object({
    to: z.string().optional(),
});

type MergeResult  = { cachedMergeId: string;  relevance: string; relevanceReason: string };
type CommitResult = { cachedCommitId: string; relevance: string; relevanceReason: string };

export const vcsRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get VCS changes between video revisions",
        description: [
            "Returns pull requests and commits between two video revision upload timestamps,",
            "with relevance scoring based on the video's vcsWatchPaths.",
            "Results are cached per UTC day in VCSFetchedRange / VCSCachedMerge / VCSCachedCommit",
            "so repeat requests and cross-video requests for the same time range are served from DB.",
        ].join(" "),
        path: "/vcs-changes",
        request: { query: QueryVcsChangesSchema },
        responses: {
            200: { description: "VCS changes retrieved successfully" },
            401: errorResponse("Unauthorized"),
            404: { description: "Video revision not found" },
            503: { description: "VCS provider not configured" },
        },
    }), async (c) => {
        const auth = await authorize(c.req.raw, ["guest", "viewer", "admin"]);

        const videoId = c.req.param("id") as string;
        await assertRoleCanSeeVideo(videoId, roleOf(auth));
        const { from: fromRevisionId, to: toRevisionId, refresh } = c.req.valid("query");

        const video = await prisma.video.findUnique({
            where: { id: videoId },
            select: { vcsWatchPaths: true },
        });
        if (!video) return c.json({ error: "Video not found" }, { status: 404 });

        if (!toRevisionId) {
            return c.json({ error: "'to' revision ID is required" }, { status: 400 });
        }

        // A revision with cached changes (e.g. the first revision, which has nothing to compare
        // against) can be served with 'to' alone; fetching from the provider still needs both ends.
        if (!fromRevisionId) {
            const cachedLink = await prisma.vCSRevisionLink.findFirst({
                where: { videoRevision: { id: toRevisionId, videoId, deleted: false }, fetchedAt: { not: null } },
                orderBy: { fetchedAt: "desc" },
            });
            if (!cachedLink) {
                return c.json({ error: "'from' revision ID is required unless changes for 'to' are already cached" }, { status: 400 });
            }
            return c.json({
                ...(await buildResponse(cachedLink.mergeResults, cachedLink.commitResults)),
                range: { from: cachedLink.rangeFrom, to: cachedLink.rangeTo },
                fromCache: true,
                fetchedAt: cachedLink.fetchedAt,
            });
        }

        const revisions = await prisma.videoRevision.findMany({ 
            where: { videoId: videoId, id: { in: [fromRevisionId, toRevisionId] }, deleted: false }, 
            orderBy: { revision: "asc" },
            select: { id: true, uploadedAt: true } }
        );

        if (revisions.length !== 2) {
            return c.json({ error: "One or both video revisions not found" }, { status: 404 });
        }

        const fromRevision = revisions.find(r => r.id === fromRevisionId);
        const toRevision   = revisions.find(r => r.id === toRevisionId);
        if (!fromRevision || !toRevision) {
            return c.json({ error: "One or both video revisions not found" }, { status: 404 });
        }
        if (fromRevision.uploadedAt >= toRevision.uploadedAt) {
            return c.json({ error: "'from' revision must be older than 'to' revision" }, { status: 400 });
        }

        const rangeTo   = startOfUTCDay(toRevision.uploadedAt);
        const rangeFrom = fromRevision
            ? startOfUTCDay(fromRevision.uploadedAt)
            : new Date(rangeTo.getTime() - DEFAULT_LOOKBACK_DAYS * 86_400_000);

        const existingLink = await prisma.vCSRevisionLink.findFirst({
            where: { videoRevisionId: toRevision.id, fetchedAt: { not: null } },
            orderBy: { fetchedAt: "desc" },
        });
        
        if (existingLink && !refresh) {
            return c.json({
                ...(await buildResponse(existingLink.mergeResults, existingLink.commitResults)),
                range: { from: existingLink.rangeFrom, to: existingLink.rangeTo },
                fromCache: true,
                fetchedAt: existingLink.fetchedAt,
            });
        }

        let provider;
        try { provider = createVCSProviderFromEnv(); } catch (err) {
            return c.json({ error: String(err) }, { status: 503 });
        }
        if (!provider) return c.json({ error: "VCS provider is not configured" }, { status: 503 });

        let vcsConfig = await prisma.vCSConfig.findFirst();
        if (!vcsConfig) {
            vcsConfig = await prisma.vCSConfig.create({
                data: { label: provider.name, provider: "github", config: {}, branch: "main" },
            });
        }

        const repoName      = provider.name;
        const vcsWatchPaths = video.vcsWatchPaths;

        await ensureDaysCached(provider, repoName, rangeFrom, rangeTo);

        const { merges, commits } = await queryByDateRange(repoName, rangeFrom, rangeTo);

        const mergeResults: MergeResult[] = merges.map(m => {
            const { relevance, relevanceReason } = scoreRelevance(m.files, vcsWatchPaths);
            return { cachedMergeId: m.id, relevance, relevanceReason };
        });
        const commitResults: CommitResult[] = commits.map(commit => {
            const { relevance, relevanceReason } = scoreRelevance(commit.files, vcsWatchPaths);
            return { cachedCommitId: commit.id, relevance, relevanceReason };
        });

        const fetchedAt = new Date();
        await prisma.vCSRevisionLink.upsert({
            where: { videoRevisionId_vcsConfigId: 
                { videoRevisionId: toRevision.id, vcsConfigId: vcsConfig.id }
            },
            create: { 
                videoRevisionId: toRevision.id, 
                vcsConfigId: vcsConfig.id, 
                rangeFrom, 
                rangeTo, 
                mergeResults: mergeResults as object[], 
                commitResults: commitResults as object[], 
                fetchedAt },
            update: { 
                rangeFrom, 
                rangeTo, 
                mergeResults: mergeResults as object[], 
                commitResults: commitResults as object[], 
                fetchedAt, 
                summary: null },
        });

        return c.json({
            ...(await buildResponse(mergeResults, commitResults)),
            range: { from: rangeFrom, to: rangeTo },
            fromCache: false,
            fetchedAt,
        });
    })
    .openapi(createRoute({
        method: "get",
        summary: "Get AI summary of VCS changes for a video revision",
        path: "/vcs-summary",
        request: { query: QueryVcsSummarySchema },
        responses: {
            200: { description: "Summary returned" },
            401: errorResponse("Unauthorized"),
            404: { description: "No cached VCS changes found" },
            503: { description: "LLM not configured" },
        },
    }), async (c) => {
        const auth = await authorize(c.req.raw, ["guest", "viewer", "admin"]);

        const videoId = c.req.param("id") as string;
        await assertRoleCanSeeVideo(videoId, roleOf(auth));
        const { to: toRevisionId } = c.req.valid("query");

        const llmClient = await createLLMClient();
        if (!llmClient) return c.json({ error: "LLM is not configured" }, { status: 503 });

        const toRevision = await prisma.videoRevision.findFirst({
            where: { videoId, id: toRevisionId, deleted: false },
        });
        if (!toRevision) return c.json({ error: "Video revision not found" }, { status: 404 });

        const link = await prisma.vCSRevisionLink.findFirst({
            where: { videoRevisionId: toRevision.id },
            orderBy: { fetchedAt: "desc" },
        });
        if (!link?.fetchedAt) {
            return c.json({ error: "No cached VCS changes. Fetch vcs-changes first." }, { status: 404 });
        }

        if (link.summary) return c.json({ summary: link.summary, fromCache: true });

        const { pullRequests } = await buildResponse(link.mergeResults, link.commitResults);
        const relevantPRs = pullRequests.filter(pr => pr.relevance === "high" || pr.relevance === "maybe");

        if (relevantPRs.length === 0) return c.json({ summary: null, fromCache: false });

        const languageHint = c.req.header("accept-language")?.split(",")[0] ?? "en";
        const prompt = buildSummaryPrompt(relevantPRs as PullRequest[], languageHint);

        let summary: string;
        try {
            summary = await llmClient.complete(prompt);
        } catch (err) {
            return c.json({ error: `LLM error: ${String(err)}` }, { status: 502 });
        }

        await prisma.vCSRevisionLink.update({ where: { id: link.id }, data: { summary } });

        return c.json({ summary, fromCache: false });
    });
async function buildResponse(
    mergeResults: unknown,
    commitResults: unknown,
): Promise<{
    pullRequests: (PullRequest & { relevance: string; relevanceReason: string })[];
    commits: (Commit & { relevance: string; relevanceReason: string })[];
}> {
    const merges  = (mergeResults  ?? []) as MergeResult[];
    const commits = (commitResults ?? []) as CommitResult[];

    const [cachedMerges, cachedCommits] = await Promise.all([
        merges.length  > 0 ? prisma.vCSCachedMerge.findMany({ where: { id: { in: merges.map(m => m.cachedMergeId) } } })  : [],
        commits.length > 0 ? prisma.vCSCachedCommit.findMany({ where: { id: { in: commits.map(c => c.cachedCommitId) } } }) : [],
    ]);

    const mergeMap  = new Map(cachedMerges.map(m => [m.id, m]));
    const commitMap = new Map(cachedCommits.map(c => [c.id, c]));

    const pullRequests = merges.flatMap(r => {
        const m = mergeMap.get(r.cachedMergeId);
        if (!m) return [];
        return [{ id: m.externalId, title: m.title, description: m.description, author: m.author, mergedAt: m.mergedAt, url: m.url, labels: m.labels, relevance: r.relevance as Relevance, relevanceReason: r.relevanceReason }];
    });

    const commitList = commits.flatMap(r => {
        const c = commitMap.get(r.cachedCommitId);
        if (!c) return [];
        return [{ hash: c.hash, shortHash: c.shortHash, message: c.message, author: c.author, committedAt: c.committedAt, url: c.url, relevance: r.relevance as Relevance, relevanceReason: r.relevanceReason }];
    });

    return { pullRequests, commits: commitList };
}

function buildSummaryPrompt(prs: PullRequest[], languageHint: string): string {
    const prLines = prs
        .map(pr => {
            const labels = pr.labels.length > 0 ? ` [${pr.labels.join(", ")}]` : "";
            const desc   = pr.description ? `\n  ${pr.description.slice(0, 200)}` : "";
            return `- #${pr.id}: ${pr.title}${labels} (@${pr.author})${desc}`;
        })
        .join("\n");

    return `The following pull requests were merged between two video review revisions.
Summarize them in 1-2 sentences, focusing on what may affect the video content being reviewed.
Match the language of the PR content. Language hint from the reviewer's browser: ${languageHint}.

Pull requests:
${prLines}

Respond with only the summary text. No markdown, no explanation.`;
}
