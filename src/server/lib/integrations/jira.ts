import "server-only";
import { z } from "@hono/zod-openapi";
import { env } from "@/server/lib/env";
import { defineIntegration, HttpUrlSchema, TestResultSchema } from "@/server/lib/integrations/define";
import { getConfig, getPlainField } from "@/server/lib/integrations/store";

const ProjectSchema = z.object({ issueTypes: z.array(z.object({ name: z.string() })) });

export const jira = defineIntegration({
    name: "jira",
    fields: {
        baseUrl: { kind: "destination", env: () => env.JIRA_BASE_URL, schema: HttpUrlSchema },
        token: { kind: "secret", env: () => env.JIRA_API_TOKEN },
        project: { kind: "plain", env: () => env.JIRA_PROJECT },
        assignee: { kind: "plain", env: () => env.JIRA_ASSIGNEE_USER },
        issueTypeTask: { kind: "plain", env: () => env.JIRA_ISSUE_TYPE_TASK },
        issueTypeBug: { kind: "plain", env: () => env.JIRA_ISSUE_TYPE_BUG },
    },
    testSchema: TestResultSchema,
    check: true,
    canTest: ({ baseUrl, token, project }) => !!baseUrl && !!token && !!project,
    test: async ({ baseUrl, token, project, issueTypeTask, issueTypeBug }) => {
        let res: Response;
        try {
            res = await fetch(`${baseUrl}/rest/api/2/project/${encodeURIComponent(project!)}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
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

// For callers that only build links, so they do not need the token decrypted.
export const getJiraBaseUrl = () => getPlainField(jira, "baseUrl");

// For the comment menu; neither value is a secret.
export async function getJiraIssueTypes() {
    return {
        task: (await getPlainField(jira, "issueTypeTask")) ?? null,
        bug: (await getPlainField(jira, "issueTypeBug")) ?? null,
    };
}
