import { ChatType } from "@/server/lib/chat/chat-type";
import { builders } from "@/server/lib/chat/webhook/builders";
import { getWebhookConfig } from "@/server/lib/integrations/webhook";

export type WebhookTarget = "slack" | "teams";

export interface WebhookPayloadBuilder {
    build(ctx: ChatType): unknown;
}

async function sendWebhook(webhookUrl: string, payload: unknown): Promise<boolean> {
    const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    return res.ok;
}

export async function chatWebhook(ctx: ChatType): Promise<boolean> {
    const { target: type, url } = await getWebhookConfig();

    if(!type || !url) {
        return false;
    }

    const builder = builders[type as WebhookTarget];
    if (!builder) return false;

    const payload = builder.build(ctx);
    return sendWebhook(url, payload);
}
