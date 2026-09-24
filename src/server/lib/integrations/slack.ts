import "server-only";
import { WebClient } from "@slack/web-api";
import { z } from "@hono/zod-openapi";
import { env } from "@/server/lib/env";
import { defineIntegration, TestResultSchema } from "@/server/lib/integrations/define";
import { getConfig, getPlainField } from "@/server/lib/integrations/store";

// Slack's API host is fixed, so nothing here decides where the token goes.
export const slack = defineIntegration({
    name: "slack",
    fields: {
        token: { kind: "secret", env: () => env.SLACK_API_TOKEN },
        channel: { kind: "plain", env: () => env.SLACK_POST_CH },
        team: { kind: "plain", env: () => env.SLACK_TEAM },
    },
    testSchema: TestResultSchema.extend({ team: z.string().optional() }),
    test: async ({ token }) => {
        if (!token) {
            return { ok: false, error: "the token is not set" };
        }

        // The client's defaults retry for about half an hour, which would leave the admin waiting.
        const client = new WebClient(token, { retryConfig: { retries: 0 }, timeout: 10_000 });
        try {
            const res = await client.auth.test();
            return { ok: true, team: res.team };
        } catch (e) {
            // The client throws on every refusal; Slack's own reason, such as invalid_auth, is in data.error.
            const reason = (e as { data?: { error?: string } }).data?.error;
            return { ok: false, error: reason ?? "slack could not be reached" };
        }
    },
});

export const getSlackConfig = () => getConfig(slack);

export const getSlackTeam = () => getPlainField(slack, "team");

let cached: { token: string; client: WebClient } | undefined;

// Rebuilt when the saved token changes, so a token saved from the admin screen applies at once.
export async function getSlackClient(): Promise<WebClient | null> {
    const { token } = await getSlackConfig();
    if (!token) {
        return null;
    }

    if (cached?.token !== token) {
        cached = { token, client: new WebClient(token) };
    }
    return cached.client;
}
