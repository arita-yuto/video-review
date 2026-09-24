import { env } from "@/server/lib/env";
import { getJiraBaseUrl } from "@/server/lib/settings/jira";
import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";

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
            404: errorResponse("Comment not found"),
            500: errorResponse("Failed to fetch external links"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["guest", "viewer", "admin"]);

        try {
            const id = c.req.param("id");
            console.debug("[external-links] request", { id });

            const comment = await prisma.videoComment.findUnique({
                where: { id },
            });

            if (!comment) {
                console.warn("[external-links] comment not found", { id });
                return c.json({ error: "comment not found" }, 404);
            }

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
                    const slackTeam = env.SLACK_TEAM;
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

                const jiraBaseURL = await getJiraBaseUrl();
                console.debug("[external-links] jiraBaseURL", { jiraBaseURL });

                if (jiraBaseURL) {
                    externalLinks.jira =
                        `${jiraBaseURL}/browse/${comment.issueId}`;
                }
            }

            console.debug("[external-links] resolved", externalLinks);

            return c.json(externalLinks, 200);

        } catch (err) {
            console.error("[external-links] exception", err);
            return c.json({ error: "failed to fetch external links" }, 500);
        }
    });
