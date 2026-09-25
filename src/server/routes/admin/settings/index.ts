import { createRouter } from "@/server/lib/openapi/router";
import { jira } from "@/server/lib/integrations/jira";
import { slack } from "@/server/lib/integrations/slack";
import { llmClaude, llmGemini, llmOllama, llmOpenAI } from "@/server/lib/integrations/llm";
import { llmProviderRouter } from "@/server/routes/admin/settings/llm-provider";
import { integrationRouter } from "@/server/routes/admin/settings/integration-router";

export const settingsRouter = createRouter()
    .route("/jira", integrationRouter(jira))
    .route("/slack", integrationRouter(slack))
    .route("/llm-provider", llmProviderRouter)
    .route("/llm-claude", integrationRouter(llmClaude))
    .route("/llm-openai", integrationRouter(llmOpenAI))
    .route("/llm-gemini", integrationRouter(llmGemini))
    .route("/llm-ollama", integrationRouter(llmOllama));
