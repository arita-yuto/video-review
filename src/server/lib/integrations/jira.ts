import "server-only";
import { z } from "@hono/zod-openapi";
import { env } from "@/server/lib/env";
import { defineIntegration, HttpUrlSchema, TestResultSchema } from "@/server/lib/integrations/define";
import { getConfig, getPlainField } from "@/server/lib/integrations/store";
import { ServerError } from "@/server/lib/server-error";

const ProjectSchema = z.object({ issueTypes: z.array(z.object({ name: z.string() })) });

export const JIRA_DEPLOYMENTS = ["data-center", "cloud"] as const;
export type JiraDeployment = typeof JIRA_DEPLOYMENTS[number];

export const jira = defineIntegration({
    name: "jira",
    fields: {
        deployment: { kind: "plain", env: () => undefined, schema: z.enum(JIRA_DEPLOYMENTS) },
        baseUrl: { kind: "destination", env: () => env.JIRA_BASE_URL, schema: HttpUrlSchema },
        email: { kind: "plain", env: () => undefined },
        token: { kind: "secret", env: () => env.JIRA_API_TOKEN },
        project: { kind: "plain", env: () => env.JIRA_PROJECT },
        assignee: { kind: "plain", env: () => env.JIRA_ASSIGNEE_USER },
        issueTypeTask: { kind: "plain", env: () => env.JIRA_ISSUE_TYPE_TASK },
        issueTypeBug: { kind: "plain", env: () => env.JIRA_ISSUE_TYPE_BUG },
    },
    testSchema: TestResultSchema,
    check: () => true,
    canTest: ({ baseUrl, token, project }) => !!baseUrl && !!token && !!project,
    test: async ({ deployment: saved, baseUrl, email, token, project, issueTypeTask, issueTypeBug }) => {
        const deployment = jiraDeployment(saved);
        if (deployment === "cloud" && !email) {
            return { ok: false, error: "Jira Cloud needs the account email" };
        }

        let res: Response;
        try {
            res = await fetch(`${baseUrl}/rest/api/2/project/${encodeURIComponent(project!)}`, {
                headers: { Authorization: jiraAuthorization(deployment, email, token!), Accept: "application/json" },
                signal: AbortSignal.timeout(10_000),
            });
        } catch {
            return { ok: false, error: "jira could not be reached" };
        }

        if (res.status === 404) {
            return { ok: false, error: `project ${project} was not found` };
        }
        if (!res.ok) {
            return { ok: false, error: `jira answered ${res.status}` };
        }

        let names: string[];
        try {
            names = ProjectSchema.parse(await res.json()).issueTypes.map(type => type.name);
        } catch {
            // Often a login or proxy page, which means the URL does not point at Jira's API.
            return { ok: false, error: "jira sent an unexpected response" };
        }

        const missing = [issueTypeTask, issueTypeBug].filter((name): name is string => !!name && !names.includes(name));
        if (missing.length > 0) {
            return { ok: false, error: `${project} has no issue type ${missing.join(", ")} (it has ${names.join(", ")})` };
        }

        return { ok: true };
    },
});

export const getJiraConfig = () => getConfig(jira);

// Unset means Data Center, so no saved value is needed for it.
export function jiraDeployment(saved: string | undefined): JiraDeployment {
    return saved === "cloud" ? "cloud" : "data-center";
}

// Jira Cloud wants the account email beside the API token (Basic); Data Center takes the token alone (Bearer).
export function jiraAuthorization(deployment: JiraDeployment, email: string | undefined, token: string) {
    return deployment === "cloud" ? `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}` : `Bearer ${token}`;
}

const AccountSchema = z.object({
    key: z.string().optional(),
    accountId: z.string().optional(),
    displayName: z.string().optional(),
    avatarUrls: z.record(z.string(), z.string()).optional(),
});
export type JiraAccount = z.infer<typeof AccountSchema>;

// Data Center searches by username, Cloud by a free query; the first hit is taken as the account.
export async function searchJiraAccount(deployment: JiraDeployment, base: string, authorization: string, email: string): Promise<JiraAccount | undefined> {
    const param = deployment === "cloud" ? "query" : "username";
    const res = await fetch(`${base}/rest/api/2/user/search?${param}=${encodeURIComponent(email)}`, {
        headers: { Authorization: authorization, Accept: "application/json" },
    });
    if (!res.ok) {
        throw new ServerError("Cannot get Jira info", 401);
    }

    const first = z.array(AccountSchema).safeParse(await res.json());
    return first.success ? first.data[0] : undefined;
}

// Jira's own id for an account: the key on Data Center, the accountId on Cloud.
export function jiraAccountId(deployment: JiraDeployment, account: JiraAccount) {
    return deployment === "cloud" ? account.accountId : account.key;
}

// For the comment menu; neither value is a secret.
export async function getJiraIssueTypes() {
    return {
        task: (await getPlainField(jira, "issueTypeTask")) ?? null,
        bug: (await getPlainField(jira, "issueTypeBug")) ?? null,
    };
}
