import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { getLoginDefaultType, LOGIN_TYPES } from "@/server/lib/integrations/general";

// Unauthenticated: the login screen opens on this tab. Which tab is selected is visible on the
// screen anyway, and the schema is fixed to this one field.
export const loginDefaultTypeRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "the tab the login screen opens on",
        path: "/",
        responses: {
            200: {
                description: "The login type selected first",
                content: { "application/json": { schema: z.object({ type: z.enum(LOGIN_TYPES) }) } },
            },
        },
    }), async (c) => {
        return c.json({ type: await getLoginDefaultType() }, 200);
    });
