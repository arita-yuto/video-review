import type { VCSProvider, GetChangesParams } from "@/server/lib/vcs/provider";
import type { ChangeSet, PullRequest, Commit } from "@/server/lib/vcs/types";
import { ServerError } from "@/server/lib/server-error";

type GitHubConfig = {
    owner: string;
    repo: string;
    token: string;
    branch?: string;
};

type GitHubPR = {
    number: number;
    title: string;
    body: string | null;
    user: { login: string } | null;
    merged_at: string | null;
    updated_at: string;
    html_url: string;
    labels: { name: string }[];
};

type GitHubCommit = {
    sha: string;
    commit: {
        message: string;
        author: { name: string; date: string } | null;
    };
    html_url: string;
};

type GitHubFile = {
    filename: string;
};

export class GitHubProvider implements VCSProvider {
    readonly name: string;
    private readonly config: GitHubConfig;

    constructor(config: GitHubConfig) {
        this.config = config;
        this.name = `github:${config.owner}/${config.repo}`;
    }

    async getChanges(params: GetChangesParams): Promise<ChangeSet> {
        const branch = params.branch ?? this.config.branch ?? "main";
        const [pullRequests, commits] = await Promise.all([
            this.fetchPullRequests(params.from, params.to),
            this.fetchCommits(params.from, params.to, branch),
        ]);
        return {
            pullRequests,
            commits,
            range: { from: params.from ?? null, to: params.to },
        };
    }

    async fetchMergeFiles(mergeId: string): Promise<string[]> {
        const url =
            `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/pulls/${mergeId}/files` +
            `?per_page=100`;
        const data = await this.get<GitHubFile[]>(url);
        return data.map(f => f.filename);
    }

    async fetchCommitFiles(hash: string): Promise<string[]> {
        const url =
            `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/commits/${hash}`;
        const data = await this.get<{ files?: GitHubFile[] }>(url);
        return (data.files ?? []).map(f => f.filename);
    }

    private async fetchPullRequests(from: Date | undefined, to: Date): Promise<PullRequest[]> {
        const results: PullRequest[] = [];
        let page = 1;
        const perPage = 100;

        // GitHub API cannot filter by mergedAt directly, so we paginate and filter client-side.
        // Break condition uses updated_at (the sort key) rather than merged_at:
        // since merged_at <= updated_at always holds, if updated_at < from then
        // merged_at < from is also guaranteed for all subsequent pages.
        outer: while (true) {
            const url =
                `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/pulls` +
                `?state=closed&sort=updated&direction=desc&per_page=${perPage}&page=${page}`;

            const data = await this.get<GitHubPR[]>(url);
            if (data.length === 0) break;

            for (const pr of data) {
                if (from && new Date(pr.updated_at) < from) break outer;
                if (!pr.merged_at) continue;
                if (pr.user?.login.includes("[bot]")) continue; // Skip bot PRs
                const mergedAt = new Date(pr.merged_at);
                if (mergedAt > to) continue;
                if (from && mergedAt < from) continue;
                results.push({
                    id: String(pr.number),
                    title: pr.title,
                    description: pr.body ?? null,
                    author: pr.user?.login ?? "unknown",
                    mergedAt,
                    url: pr.html_url,
                    labels: pr.labels.map(l => l.name),
                    // Relevance is applied by the route after vcsWatchPaths are resolved
                    relevance: "high",
                    relevanceReason: "pending",
                });
            }

            if (data.length < perPage) break;
            page++;
        }

        return results;
    }

    private async fetchCommits(from: Date | undefined, to: Date, branch: string): Promise<Commit[]> {
        const results: Commit[] = [];
        let page = 1;
        const perPage = 100;

        const sinceParam = from ? `&since=${from.toISOString()}` : "";
        const untilParam = `&until=${to.toISOString()}`;

        while (true) {
            const url =
                `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/commits` +
                `?sha=${branch}${sinceParam}${untilParam}&per_page=${perPage}&page=${page}`;

            const data = await this.get<GitHubCommit[]>(url);
            if (data.length === 0) break;

            for (const c of data) {
                if (c.commit?.author?.name.includes("[bot]")) continue;

                results.push({
                    hash: c.sha,
                    shortHash: c.sha.slice(0, 7),
                    message: c.commit.message.split("\n")[0],
                    author: c.commit.author?.name ?? "unknown",
                    committedAt: new Date(c.commit.author?.date ?? to),
                    url: c.html_url,
                    relevance: "high",
                    relevanceReason: "pending",
                });
            }

            if (data.length < perPage) break;
            page++;
        }

        return results;
    }

    private async get<T>(url: string): Promise<T> {
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.config.token}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
        if (!res.ok) {
            // GitHub explains the failure in the body's message, e.g. the organization's SAML enforcement.
            const body = await res.json().catch(() => null) as { message?: string } | null;
            const reason = body?.message ?? res.statusText;
            throw new ServerError(`GitHub API error: ${res.status} ${reason} — ${url}`, 502);
        }
        return res.json() as Promise<T>;
    }
}
