import { createRouter } from "@/server/lib/openapi/router";
import { jira } from "@/server/lib/integrations/jira";
import { slack } from "@/server/lib/integrations/slack";
import { webhook } from "@/server/lib/integrations/webhook";
import { email } from "@/server/lib/integrations/email";
import { vcsGitHub } from "@/server/lib/integrations/vcs";
import { llmClaude, llmGemini, llmOllama, llmOpenAI } from "@/server/lib/integrations/llm";
import { llmProviderRouter } from "@/server/routes/admin/settings/llm-provider";
import { vcsProviderRouter } from "@/server/routes/admin/settings/vcs-provider";
import { mcpGuideRouter } from "@/server/routes/admin/settings/mcp-guide";
import { integrationRouter } from "@/server/routes/admin/settings/integration-router";

export const settingsRouter = createRouter()
    .route("/jira", integrationRouter(jira))
    .route("/slack", integrationRouter(slack))
    .route("/webhook", integrationRouter(webhook))
    .route("/email", integrationRouter(email))
    .route("/vcs-provider", vcsProviderRouter)
    .route("/vcs-github", integrationRouter(vcsGitHub))
    .route("/mcp-guide", mcpGuideRouter)
    .route("/llm-provider", llmProviderRouter)
    .route("/llm-claude", integrationRouter(llmClaude))
    .route("/llm-openai", integrationRouter(llmOpenAI))
    .route("/llm-gemini", integrationRouter(llmGemini))
    .route("/llm-ollama", integrationRouter(llmOllama));
