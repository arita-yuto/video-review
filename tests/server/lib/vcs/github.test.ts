import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubProvider } from "@/server/lib/vcs/providers/github";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePR(overrides: Partial<{
    number: number;
    title: string;
    merged_at: string | null;
    updated_at: string;
    labels: { name: string }[];
}> = {}) {
    const merged_at = "merged_at" in overrides ? overrides.merged_at : "2026-03-15T10:00:00Z";
    return {
        number: overrides.number ?? 1,
        title: overrides.title ?? "Test PR",
        body: null,
        user: { login: "tester" },
        merged_at,
        // updated_at defaults to merged_at (realistic default); override to simulate "old PR recently commented"
        updated_at: overrides.updated_at ?? merged_at ?? "2026-03-15T10:00:00Z",
        html_url: `https://github.com/org/repo/pull/${overrides.number ?? 1}`,
        labels: overrides.labels ?? [],
    };
}

function makeCommit(overrides: Partial<{
    sha: string;
    message: string;
    date: string;
}> = {}) {
    return {
        sha: overrides.sha ?? "abc1234def5678",
        commit: {
            message: overrides.message ?? "Fix something",
            author: { name: "tester", date: overrides.date ?? "2026-03-15T12:00:00Z" },
        },
        html_url: `https://github.com/org/repo/commit/${overrides.sha ?? "abc1234def5678"}`,
    };
}

function mockFetch(...pages: object[][]) {
    let call = 0;
    return vi.fn(async () => {
        const data = pages[Math.min(call++, pages.length - 1)];
        return {
            ok: true,
            json: async () => data,
        };
    });
}

function mockFetchByUrl(prPages: object[][], commitPages: object[][]) {
    const prCall = { count: 0 };
    const commitCall = { count: 0 };
    return vi.fn(async (url: string) => {
        let data: object[];
        if ((url as string).includes("/pulls")) {
            data = prPages[Math.min(prCall.count++, prPages.length - 1)];
        } else {
            data = commitPages[Math.min(commitCall.count++, commitPages.length - 1)];
        }
        return { ok: true, json: async () => data };
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GitHubProvider", () => {
    const provider = new GitHubProvider({
        owner: "org",
        repo: "repo",
        token: "test-token",
        branch: "main",
    });

    let fetchSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchSpy = vi.fn();
        vi.stubGlobal("fetch", fetchSpy);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("has the correct name", () => {
        expect(provider.name).toBe("github:org/repo");
    });

    it("returns PRs merged within the from–to range", async () => {
        const from = new Date("2026-03-10T00:00:00Z");
        const to   = new Date("2026-03-20T00:00:00Z");

        fetchSpy = mockFetch(
            // PRs page 1
            [
                makePR({ number: 10, title: "In range",     merged_at: "2026-03-15T10:00:00Z" }),
                makePR({ number: 9,  title: "Too early",    merged_at: "2026-03-05T10:00:00Z" }),
            ],
            // Commits page 1
            [makeCommit({ date: "2026-03-15T12:00:00Z" })],
        );
        vi.stubGlobal("fetch", fetchSpy);

        const result = await provider.getChanges({ from, to });

        expect(result.pullRequests).toHaveLength(1);
        expect(result.pullRequests[0].title).toBe("In range");
        expect(result.pullRequests[0].id).toBe("10");
    });

    it("excludes PRs merged after `to`", async () => {
        const from = new Date("2026-03-10T00:00:00Z");
        const to   = new Date("2026-03-20T00:00:00Z");

        fetchSpy = mockFetch(
            [makePR({ number: 11, title: "Too late", merged_at: "2026-03-25T10:00:00Z" })],
            [],
        );
        vi.stubGlobal("fetch", fetchSpy);

        const result = await provider.getChanges({ from, to });
        expect(result.pullRequests).toHaveLength(0);
    });

    it("excludes unmerged PRs (merged_at is null)", async () => {
        const to = new Date("2026-03-20T00:00:00Z");

        fetchSpy = mockFetch(
            [makePR({ number: 5, merged_at: null })],
            [],
        );
        vi.stubGlobal("fetch", fetchSpy);

        const result = await provider.getChanges({ to });
        expect(result.pullRequests).toHaveLength(0);
    });

    it("returns correct commit shape", async () => {
        const to = new Date("2026-03-20T00:00:00Z");

        fetchSpy = mockFetch(
            // PRs — empty
            [],
            // Commits
            [makeCommit({ sha: "deadbeef1234", message: "Fix camera\n\nDetails here", date: "2026-03-18T09:00:00Z" })],
        );
        vi.stubGlobal("fetch", fetchSpy);

        const result = await provider.getChanges({ to });

        expect(result.commits).toHaveLength(1);
        const commit = result.commits[0];
        expect(commit.hash).toBe("deadbeef1234");
        expect(commit.shortHash).toBe("deadbee");
        // Only the first line of the commit message
        expect(commit.message).toBe("Fix camera");
        expect(commit.author).toBe("tester");
    });

    it("sends Authorization header with Bearer token", async () => {
        const to = new Date("2026-03-20T00:00:00Z");
        fetchSpy = mockFetch([], []);
        vi.stubGlobal("fetch", fetchSpy);

        await provider.getChanges({ to });

        const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
        expect((options.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-token");
    });

    it("includes since/until and branch in commit request URL", async () => {
        const from = new Date("2026-03-10T00:00:00Z");
        const to   = new Date("2026-03-20T00:00:00Z");
        fetchSpy = mockFetch([], []);
        vi.stubGlobal("fetch", fetchSpy);

        await provider.getChanges({ from, to, branch: "develop" });

        // Second fetch call is for commits
        const commitUrl = fetchSpy.mock.calls[1][0] as string;
        expect(commitUrl).toContain("sha=develop");
        expect(commitUrl).toContain(`since=${from.toISOString()}`);
        expect(commitUrl).toContain(`until=${to.toISOString()}`);
    });

    // -------------------------------------------------------------------
    // Break-outer timing bug hypothesis
    // -------------------------------------------------------------------
    // Scenario: PRs are sorted by `updated_at` desc.
    // If a PR was merged long ago (mergedAt < from) but updated recently,
    // it appears early in the list and triggers `break outer` before
    // in-range PRs on later pages are ever fetched.
    // -------------------------------------------------------------------

    it("does NOT miss in-range PRs when an out-of-range PR appears before them (same page)", async () => {
        const from = new Date("2026-03-10T00:00:00Z");
        const to   = new Date("2026-03-20T00:00:00Z");

        // OLD-merged PR appears BEFORE in-range PR (simulates "updated recently" sort)
        fetchSpy = mockFetch(
            [
                makePR({ number: 99, title: "Old PR recently commented", merged_at: "2026-01-01T00:00:00Z", updated_at: "2026-03-19T00:00:00Z" }),
                makePR({ number: 50, title: "Should be included",        merged_at: "2026-03-15T10:00:00Z", updated_at: "2026-03-15T10:00:00Z" }),
            ],
            [],
        );
        vi.stubGlobal("fetch", fetchSpy);

        const result = await provider.getChanges({ from, to });

        console.log("[test] pullRequests:", result.pullRequests.map(p => p.title));
        // If break outer fires on PR #99, PR #50 will be missing
        expect(result.pullRequests).toHaveLength(1);
        expect(result.pullRequests[0].title).toBe("Should be included");
    });

    it("does NOT miss in-range PRs when an out-of-range PR appears on page 1 and in-range PRs are on page 2", async () => {
        const from = new Date("2026-03-10T00:00:00Z");
        const to   = new Date("2026-03-20T00:00:00Z");

        // Fill page 1 with 100 old PRs (updated recently → updated_at check won't break, merged_at check → continue)
        // This forces page 2 to be fetched, where the in-range PR lives.
        const page1 = Array.from({ length: 100 }, (_, i) =>
            makePR({ number: 200 + i, title: `Old PR ${i}`, merged_at: "2026-01-01T00:00:00Z", updated_at: "2026-03-19T00:00:00Z" })
        );
        fetchSpy = mockFetchByUrl(
            // PR pages
            [page1, [makePR({ number: 50, title: "Should be included", merged_at: "2026-03-15T10:00:00Z", updated_at: "2026-03-15T10:00:00Z" })]],
            // Commit pages
            [[]],
        );
        vi.stubGlobal("fetch", fetchSpy);

        const result = await provider.getChanges({ from, to });

        console.log("[test] pullRequests:", result.pullRequests.map(p => p.title));
        // This test will FAIL with the current break-outer logic, confirming the bug
        expect(result.pullRequests).toHaveLength(1);
        expect(result.pullRequests[0].title).toBe("Should be included");
    });

    it("throws with GitHub's reason on non-OK response", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: false,
            status: 403,
            statusText: "Forbidden",
            json: async () => ({ message: "Resource protected by organization SAML enforcement." }),
        })));

        await expect(provider.getChanges({ to: new Date() })).rejects.toMatchObject({
            status: 502,
            message: expect.stringContaining("GitHub API error: 403 Resource protected by organization SAML enforcement."),
        });
    });

    it("falls back to the status text when the error body is not JSON", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: false,
            status: 502,
            statusText: "Bad Gateway",
            json: async () => { throw new SyntaxError("Unexpected token <"); },
        })));

        await expect(provider.getChanges({ to: new Date() })).rejects.toMatchObject({
            status: 502,
            message: expect.stringContaining("GitHub API error: 502 Bad Gateway"),
        });
    });

    it("returns correct range metadata", async () => {
        const from = new Date("2026-03-10T00:00:00Z");
        const to   = new Date("2026-03-20T00:00:00Z");
        fetchSpy = mockFetch([], []);
        vi.stubGlobal("fetch", fetchSpy);

        const result = await provider.getChanges({ from, to });
        expect(result.range.from).toEqual(from);
        expect(result.range.to).toEqual(to);
    });

    it("sets range.from to null when `from` is omitted", async () => {
        const to = new Date("2026-03-20T00:00:00Z");
        fetchSpy = mockFetch([], []);
        vi.stubGlobal("fetch", fetchSpy);

        const result = await provider.getChanges({ to });
        expect(result.range.from).toBeNull();
    });

    it("handles PR labels correctly", async () => {
        const to = new Date("2026-03-20T00:00:00Z");
        fetchSpy = mockFetch(
            [makePR({ number: 1, labels: [{ name: "bug" }, { name: "camera" }] })],
            [],
        );
        vi.stubGlobal("fetch", fetchSpy);

        const result = await provider.getChanges({ to });
        expect(result.pullRequests[0].labels).toEqual(["bug", "camera"]);
    });
});
