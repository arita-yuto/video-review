import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { issueTracker } from "@/server/lib/issue-tracker";
import { IssueSchema } from "@/server/lib/issue-tracker/tracker";
import { ServerError } from "@/server/lib/server-error";

export const issueLookupRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "The tracker issue behind a key typed into the issue field",
        path: "/",
        request: { query: z.object({ key: z.string().min(1) }) },
        responses: {
            200: {
                description: "The issue",
                content: { "application/json": { schema: IssueSchema } },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: errorResponse("The tracker has no such issue"),
            500: errorResponse("Issue tracker not configured or unreachable"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["viewer", "admin"]);
        const { key } = c.req.valid("query");

        const tracker = await issueTracker();
        if (!tracker) {
            throw new ServerError("issue tracker is not configured", 500);
        }

        const issue = await tracker.getIssue(key);
        if (!issue) {
            return c.json({ error: `issue ${key} was not found` }, 404);
        }

        return c.json(issue, 200);
    });
