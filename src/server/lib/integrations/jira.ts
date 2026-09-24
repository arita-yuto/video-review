import "server-only";
import { z } from "@hono/zod-openapi";
import { env } from "@/server/lib/env";
import { defineIntegration, HttpUrlSchema, TestResultSchema } from "@/server/lib/integrations/define";
import { getConfig, getPlainField } from "@/server/lib/integrations/store";

const ProjectListSchema = z.array(z.object({ key: z.string(), name: z.string() }));

export const jira = defineIntegration({
    name: "jira",
    fields: {
        baseUrl: { kind: "destination", env: () => env.JIRA_BASE_URL, schema: HttpUrlSchema },
        token: { kind: "secret", env: () => env.JIRA_API_TOKEN },
        project: { kind: "plain", env: () => env.JIRA_PROJECT },
        assignee: { kind: "plain", env: () => env.JIRA_ASSIGNEE_USER },
    },
    testSchema: TestResultSchema.extend({ projects: ProjectListSchema.optional() }),
    test: async ({ baseUrl, token }) => {
        if (!baseUrl || !token) {
            return { ok: false, error: "the url and token are not both set" };
        }

        let res: Response;
        try {
            res = await fetch(`${baseUrl}/rest/api/2/project`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                signal: AbortSignal.timeout(10_000),
            });
        } catch {
            return { ok: false, error: "jira could not be reached" };
        }

        if (!res.ok) {
            return { ok: false, error: `jira answered ${res.status}` };
        }

        try {
            return { ok: true, projects: ProjectListSchema.parse(await res.json()) };
        } catch {
            // Often a login or proxy page, which means the URL does not point at Jira's API.
            return { ok: false, error: "jira sent an unexpected response" };
        }
    },
});

export const getJiraConfig = () => getConfig(jira);

// For callers that only build links, so they do not need the token decrypted.
export const getJiraBaseUrl = () => getPlainField(jira, "baseUrl");
