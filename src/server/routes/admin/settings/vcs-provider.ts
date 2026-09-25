import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { getVCSProviderName, VCSProviderSchema, saveVCSProviderName } from "@/server/lib/integrations/vcs";

const ProviderStateSchema = z.object({ provider: VCSProviderSchema.nullable() });

// Which provider the VCS features use; each provider's own settings live under /vcs-<provider>.
export const vcsProviderRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "the VCS provider in use",
        path: "/",
        responses: {
            200: { description: "The provider in use", content: { "application/json": { schema: ProviderStateSchema } } },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        return c.json({ provider: (await getVCSProviderName()) ?? null }, 200);
    })
    .openapi(createRoute({
        method: "put",
        summary: "switch the VCS provider",
        path: "/",
        request: { body: { content: { "application/json": { schema: z.object({ provider: VCSProviderSchema }) } } } },
        responses: {
            200: { description: "The provider in use", content: { "application/json": { schema: ProviderStateSchema } } },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        await saveVCSProviderName(c.req.valid("json").provider);

        return c.json({ provider: (await getVCSProviderName()) ?? null }, 200);
    });
