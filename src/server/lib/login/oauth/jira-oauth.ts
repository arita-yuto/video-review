import "server-only";
import { z } from "@hono/zod-openapi";
import { ServerError } from "@/server/lib/server-error";
import { getJiraBaseUrl, getJiraLoginConfig } from "@/server/lib/integrations/jira";
import { loginJiraUser, MyselfSchema } from "@/server/lib/login/jira/jira-user";
import type { OAuthProvider } from "@/server/lib/login/oauth";

const TokenSchema = z.object({ access_token: z.string() });

async function client() {
    const baseUrl = await getJiraBaseUrl();
    const { clientId, clientSecret } = await getJiraLoginConfig();
    if (!baseUrl || !clientId || !clientSecret) {
        throw new ServerError("jira login is not configured", 401);
    }
    return { baseUrl, clientId, clientSecret };
}

// Jira Data Center as the OAuth 2.0 server (an incoming application link); the token is used once, to ask who signed in.
export const jiraOAuth: OAuthProvider = {
    async isConfigured() {
        const { clientId, clientSecret } = await getJiraLoginConfig();
        return !!(await getJiraBaseUrl()) && !!clientId && !!clientSecret;
    },

    async authorizeUrl({ redirectUri, state }) {
        const { baseUrl, clientId } = await client();
        const url = new URL(`${baseUrl}/rest/oauth2/latest/authorize`);
        url.search = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "READ",
            state,
        }).toString();
        return url.toString();
    },

    async login({ code, redirectUri }) {
        const { baseUrl, clientId, clientSecret } = await client();

        const tokenRes = await fetch(`${baseUrl}/rest/oauth2/latest/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
            }),
            signal: AbortSignal.timeout(10_000),
        });
        if (!tokenRes.ok) {
            throw new ServerError("jira did not accept the login", 401);
        }
        const { access_token } = TokenSchema.parse(await tokenRes.json());

        const meRes = await fetch(`${baseUrl}/rest/api/2/myself`, {
            headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json" },
            signal: AbortSignal.timeout(10_000),
        });
        if (!meRes.ok) {
            throw new ServerError("jira did not say who signed in", 401);
        }

        return loginJiraUser(MyselfSchema.parse(await meRes.json()));
    },
};
