import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { getLLMProvider, LLMProviderSchema, saveLLMProvider } from "@/server/lib/integrations/llm";

const ProviderStateSchema = z.object({ provider: LLMProviderSchema.nullable() });

// Which provider's settings the AI features use; each provider's own settings live under /llm-<provider>.
export const llmProviderRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "the LLM provider in use",
        path: "/",
        responses: {
            200: { description: "The provider in use", content: { "application/json": { schema: ProviderStateSchema } } },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        return c.json({ provider: (await getLLMProvider()) ?? null }, 200);
    })
    .openapi(createRoute({
        method: "put",
        summary: "switch the LLM provider",
        path: "/",
        request: { body: { content: { "application/json": { schema: z.object({ provider: LLMProviderSchema }) } } } },
        responses: {
            200: { description: "The provider in use", content: { "application/json": { schema: ProviderStateSchema } } },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        await saveLLMProvider(c.req.valid("json").provider);

        return c.json({ provider: (await getLLMProvider()) ?? null }, 200);
    });
