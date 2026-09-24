import { createRouter } from "@/server/lib/openapi/router";
import { jira } from "@/server/lib/integrations/jira";
import { slack } from "@/server/lib/integrations/slack";
import { integrationRouter } from "@/server/routes/admin/settings/integration-router";

export const settingsRouter = createRouter()
    .route("/jira", integrationRouter(jira))
    .route("/slack", integrationRouter(slack));
