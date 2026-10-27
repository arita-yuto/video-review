import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { prisma } from "@/server/lib/db";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorizeVideo } from "@/server/lib/videos/guest-access";
import { roleOf } from "@/server/lib/token";
import { issueTracker } from "@/server/lib/issue-tracker";
import { IssueSchema, type Issue } from "@/server/lib/issue-tracker/tracker";

export const issueStatusRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Tracker issues linked from the video's comments",
        description: "Summary and status keyed by issue key. Keys the tracker does not know, and all keys when no tracker is configured, are left out. A guest gets an empty summary.",
        path: "/",
        responses: {
            200: {
                description: "Issues by issue key",
                content: { "application/json": { schema: z.record(z.string(), IssueSchema) } },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        const videoId = c.req.param("id") as string;
        const auth = await authorizeVideo(c.req.raw, ["guest", "viewer", "admin"], videoId);
        // A guest sees the status icon but not the title, which may have been written in the tracker for the team only.
        const guest = roleOf(auth) === "guest";

        const linked = await prisma.videoComment.findMany({
            where: { videoId, deleted: false, issueId: { not: null } },
            select: { issueId: true },
            distinct: ["issueId"],
        });
        const keys = linked.map(row => row.issueId).filter((key): key is string => !!key);

        const tracker = await issueTracker();
        if (!tracker) {
            return c.json({}, 200);
        }

        // An unreachable tracker leaves the chips without a status rather than failing the panel.
        const issues: Record<string, Issue> = {};
        await Promise.all(keys.map(async (key) => {
            const issue = await tracker.getIssue(key).catch(() => null);
            if (issue) {
                issues[key] = guest ? { ...issue, summary: "" } : issue;
            }
        }));

        return c.json(issues, 200);
    });
