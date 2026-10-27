import { env } from "@/server/lib/env";
import { issueTracker } from "@/server/lib/issue-tracker";
import { getSlackTeam } from "@/server/lib/integrations/slack";
import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorizeComment } from "@/server/lib/videos/guest-access";

export const externalLinksRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get external links",
        path: "/",
        responses: {
            200: {
                description: "External links keyed by provider",
                content: {
                    "application/json": {
                        schema: z.record(z.string(), z.string()),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            404: errorResponse("Comment not found"),
            500: errorResponse("Failed to fetch external links"),
        },
    }), async (c) => {
        const id = c.req.param("id") as string;
        const { comment } = await authorizeComment(c.req.raw, ["guest", "viewer", "admin"], id);
        console.debug("[external-links] request", { id });

        try {
            console.debug("[external-links] comment loaded", {
                id: comment.id,
                notifiedProviders: comment.notifiedProviders,
                issueId: comment.issueId,
            });

            const externalLinks: Record<string, string> = {};

            // Slack
            if (comment.notifiedProviders.includes("slack")) {
                console.debug("[external-links] slack notified");

                const slack = await prisma.slackMessage.findUnique({
                    where: { videoCommentId: comment.id }
                });

                console.debug("[external-links] slackMessage", {
                    found: !!slack,
                });

                if (slack) {
                    const slackTeam = await getSlackTeam();
                    console.debug("[external-links] slackTeam", { slackTeam });

                    if (slackTeam) {
                        externalLinks.slack =
                            `https://${slackTeam}.slack.com/archives/${slack.channelId}/p${slack.ts}`;
                    }
                }
            }

            // Jira
            if (comment.issueId) {
                console.debug("[external-links] jira issue detected", {
                    issueId: comment.issueId,
                });

                const tracker = await issueTracker();
                if (tracker) {
                    externalLinks.jira = tracker.issueUrl(comment.issueId);
                }
            }

            console.debug("[external-links] resolved", externalLinks);

            return c.json(externalLinks, 200);

        } catch (err) {
            console.error("[external-links] exception", err);
            return c.json({ error: "failed to fetch external links" }, 500);
        }
    });
