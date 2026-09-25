import "server-only";
import { z } from "@hono/zod-openapi";
import { env } from "@/server/lib/env";
import { getSetting, saveSetting } from "@/server/lib/settings";
import { defineIntegration, TestResultSchema } from "@/server/lib/integrations/define";
import { getConfig } from "@/server/lib/integrations/store";
import { createVCSProvider } from "@/server/lib/vcs/factory";
import type { VCSProvider } from "@/server/lib/vcs/provider";

export const VCS_PROVIDERS = ["github"] as const;
export type VCSProviderName = (typeof VCS_PROVIDERS)[number];
export const VCSProviderSchema = z.enum(VCS_PROVIDERS);

// env holds one provider's settings; they only count for the provider env names.
const fromEnv = (provider: VCSProviderName, value: () => string | undefined) => () =>
    env.VCS_PROVIDER === provider ? value() : undefined;

async function gitHubGet(path: string, token: string) {
    return fetch(`https://api.github.com${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(10_000),
    });
}

// GitHub's API host is fixed, so nothing here decides where the token goes.
export const vcsGitHub = defineIntegration({
    name: "vcs-github",
    fields: {
        owner: { kind: "plain", env: fromEnv("github", () => env.VCS_GITHUB_OWNER) },
        repo: { kind: "plain", env: fromEnv("github", () => env.VCS_GITHUB_REPO) },
        token: { kind: "secret", env: fromEnv("github", () => env.VCS_GITHUB_TOKEN) },
        branch: { kind: "plain", env: fromEnv("github", () => env.VCS_BRANCH) },
    },
    testSchema: TestResultSchema,
    check: () => true,
    canTest: ({ owner, repo, token }) => !!owner && !!repo && !!token,
    test: async ({ owner, repo, token, branch }) => {
        const repoPath = `/repos/${encodeURIComponent(owner!)}/${encodeURIComponent(repo!)}`;
        try {
            const res = await gitHubGet(repoPath, token!);
            if (!res.ok) return { ok: false, error: `github answered ${res.status} for ${owner}/${repo}` };

            if (branch) {
                const found = await gitHubGet(`${repoPath}/branches/${encodeURIComponent(branch)}`, token!);
                if (!found.ok) return { ok: false, error: `github answered ${found.status} for branch ${branch}` };
            }
            return { ok: true };
        } catch {
            return { ok: false, error: "github could not be reached" };
        }
    },
});

const PROVIDER_KEY = "vcs.provider";

export async function getVCSProviderName(): Promise<VCSProviderName | undefined> {
    return getSetting<VCSProviderName>(PROVIDER_KEY, env.VCS_PROVIDER === "github" ? "github" : undefined);
}

export async function saveVCSProviderName(provider: VCSProviderName) {
    await saveSetting(PROVIDER_KEY, provider);
}

// The provider in use, or null until one is picked and its settings are complete.
export async function getVCSProvider(): Promise<VCSProvider | null> {
    if (await getVCSProviderName() !== "github") return null;

    const { owner, repo, token, branch } = await getConfig(vcsGitHub);
    if (!owner || !repo || !token) return null;
    return createVCSProvider({ provider: "github", owner, repo, token, branch });
}
