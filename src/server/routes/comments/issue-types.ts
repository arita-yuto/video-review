import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { getJiraIssueTypes } from "@/server/lib/integrations/jira";

export const issueTypesRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Jira issue type names for the comment menu",
        path: "/",
        responses: {
            200: {
                description: "The configured names; null disables the menu item",
                content: { "application/json": { schema: z.object({ task: z.string().nullable(), bug: z.string().nullable() }) } },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["viewer", "admin"]);

        return c.json(await getJiraIssueTypes(), 200);
    });
