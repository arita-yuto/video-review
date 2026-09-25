import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { isGuestAllowed } from "@/server/lib/integrations/general";

// Unauthenticated: the login screen decides whether to show the guest tab with it. The value is
// nothing a visitor could not learn by trying the guest login, and the schema is fixed to this one field.
export const guestEnabledRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "whether guest login is enabled",
        path: "/",
        responses: {
            200: {
                description: "Whether the guest tab is offered",
                content: { "application/json": { schema: z.object({ enabled: z.boolean() }) } },
            },
        },
    }), async (c) => {
        return c.json({ enabled: await isGuestAllowed() }, 200);
    });
