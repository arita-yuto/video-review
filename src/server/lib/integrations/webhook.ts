import "server-only";
import { z } from "@hono/zod-openapi";
import { env } from "@/server/lib/env";
import { defineIntegration, TestResultSchema } from "@/server/lib/integrations/define";
import { getConfig } from "@/server/lib/integrations/store";
import { builders } from "@/server/lib/chat/webhook/builders";
import type { WebhookTarget } from "@/server/lib/chat/webhook";

export const webhook = defineIntegration({
    name: "webhook",
    fields: {
        target: { kind: "plain", env: () => env.WEBHOOK_TARGET, schema: z.enum(["slack", "teams"]) },
        // The URL usually carries its own token, so it is kept like a secret.
        url: { kind: "secret", env: () => env.WEBHOOK_URL },
    },
    testSchema: TestResultSchema,
    check: false,
    canTest: ({ target, url }) => !!target && !!url,
    // A webhook can't be checked without posting, so the test sends one message to the channel.
    test: async ({ target, url }) => {
        const builder = builders[target as WebhookTarget];
        if (!builder) return { ok: false, error: `unknown target ${target}` };
        const payload = builder.build({
            commentText: "Webhook test from the admin screen.",
        });
        try {
            const res = await fetch(url!, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(10_000),
            });
            return res.ok ? { ok: true } : { ok: false, error: `the webhook answered ${res.status}` };
        } catch {
            return { ok: false, error: "the webhook could not be reached" };
        }
    },
});

export const getWebhookConfig = () => getConfig(webhook);
