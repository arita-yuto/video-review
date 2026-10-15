import "server-only";
import { z } from "@hono/zod-openapi";
import { defineIntegration, TestResultSchema } from "@/server/lib/integrations/define";
import { getJiraBaseUrl } from "@/server/lib/integrations/jira";

const TokenErrorSchema = z.object({ error: z.string() });

// Uses the Jira URL from the issue settings.
export const jiraLogin = defineIntegration({
    name: "jira-login",
    fields: {
        clientId: { kind: "plain", env: () => undefined },
        clientSecret: { kind: "secret", env: () => undefined },
    },
    testSchema: TestResultSchema,
    check: () => true,
    canTest: ({ clientId, clientSecret }) => !!clientId && !!clientSecret,
    // Checks the client without a user: a made-up code is rejected as invalid_grant once the client is accepted.
    test: async ({ clientId, clientSecret }) => {
        const baseUrl = await getJiraBaseUrl();
        if (!baseUrl) {
            return { ok: false, error: "set the Jira URL first" };
        }

        let res: Response;
        try {
            res = await fetch(`${baseUrl}/rest/oauth2/latest/token`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    code: "probe",
                    client_id: clientId!,
                    client_secret: clientSecret!,
                }),
                signal: AbortSignal.timeout(10_000),
            });
        } catch {
            return { ok: false, error: "jira could not be reached" };
        }

        let error: string;
        try {
            error = TokenErrorSchema.parse(await res.json()).error;
        } catch {
            return { ok: false, error: "jira sent an unexpected response" };
        }

        if (error === "invalid_client") {
            return { ok: false, error: "jira does not accept this client id and secret" };
        }
        if (error !== "invalid_grant") {
            return { ok: false, error: `jira answered ${error}` };
        }
        return { ok: true };
    },
});
