import { booleanEnv, resolveEnv } from "@/lib/env/helpers";
import { env as StorageEnv } from "./storage-env";

import "server-only"

export const env = {
    ...StorageEnv,
    DATABASE_URL: process.env.DATABASE_URL,
    DB_IDLE_DISCONNECT_MS: process.env.VIDEO_REVIEW_DB_IDLE_DISCONNECT_MS,
    VIDEO_REVIEW_API_TOKEN: process.env.VIDEO_REVIEW_API_TOKEN,
    // Default on for compatibility; only an explicit "false" disables guest login.
    ALLOW_GUEST: process.env.VIDEO_REVIEW_ALLOW_GUEST !== "false",
    EMAIL_ENABLE: booleanEnv(process.env.VIDEO_REVIEW_EMAIL_ENABLE),
    SMTP_HOST: process.env.VIDEO_REVIEW_SMTP_HOST,
    SMTP_PORT: process.env.VIDEO_REVIEW_SMTP_PORT,
    EMAIL_FROM: process.env.VIDEO_REVIEW_EMAIL_FROM,
    SLACK_TEAM: resolveEnv(process.env.VIDEO_REVIEW_SLACK_TEAM, process.env.SLACK_TEAM),
    SLACK_API_TOKEN: resolveEnv(process.env.VIDEO_REVIEW_SLACK_API_TOKEN, process.env.SLACK_API_TOKEN),
    SLACK_POST_CH: resolveEnv(process.env.VIDEO_REVIEW_SLACK_POST_CH, process.env.SLACK_POST_CH),
    JIRA_BASE_URL: resolveEnv(process.env.VIDEO_REVIEW_JIRA_BASE_URL, resolveEnv(process.env.JIRA_BASE_URL, process.env.NEXT_PUBLIC_JIRA_BASE_URL)),
    JIRA_API_TOKEN: resolveEnv(process.env.VIDEO_REVIEW_JIRA_API_TOKEN, process.env.JIRA_API_TOKEN),
    JIRA_PROJECT: resolveEnv(process.env.VIDEO_REVIEW_JIRA_PROJECT, process.env.JIRA_PROJECT),
    JIRA_ASSIGNEE_USER: resolveEnv(process.env.VIDEO_REVIEW_JIRA_ASSIGNEE_USER, process.env.JIRA_ASSIGNEE_USER),
    // Defaults for the admin screen's issue types. NEXT_PUBLIC_ values are fixed at build time.
    JIRA_ISSUE_TYPE_TASK: resolveEnv(process.env.NEXT_PUBLIC_VIDEO_REVIEW_JIRA_ISSUE_TYPE_TASK, process.env.NEXT_PUBLIC_JIRA_ISSUE_TYPE_TASK),
    JIRA_ISSUE_TYPE_BUG: resolveEnv(process.env.NEXT_PUBLIC_VIDEO_REVIEW_JIRA_ISSUE_TYPE_BUG, process.env.NEXT_PUBLIC_JIRA_ISSUE_TYPE_BUG),
    WEBHOOK_TARGET: process.env.VIDEO_REVIEW_WEBHOOK_TARGET,
    WEBHOOK_URL: process.env.VIDEO_REVIEW_WEBHOOK_URL,
    SMTP_TLS_STRICT: booleanEnv(process.env.VIDEO_REVIEW_SMTP_TLS_STRICT),
    JWT_SECRET_deprecated: process.env.JWT_SECRET,
    // LLM provider: "claude" | "openai" | "gemini" | "ollama" (unset = disabled)
    LLM_PROVIDER: process.env.VIDEO_REVIEW_LLM_PROVIDER as "claude" | "openai" | "gemini" | "ollama" | undefined,
    LLM_API_KEY: process.env.VIDEO_REVIEW_LLM_API_KEY,
    LLM_BASE_URL: process.env.VIDEO_REVIEW_LLM_BASE_URL,
    LLM_MODEL: process.env.VIDEO_REVIEW_LLM_MODEL,
    // MCP server URL (unset = chat-search disabled)
    MCP_URL: process.env.VIDEO_REVIEW_MCP_URL,
    // VCS integration (Phase 1: env-based config)
    VCS_PROVIDER: process.env.VIDEO_REVIEW_VCS_PROVIDER as "github" | "gitlab" | "svn" | "perforce" | undefined,
    VCS_GITHUB_OWNER: process.env.VIDEO_REVIEW_VCS_GITHUB_OWNER,
    VCS_GITHUB_REPO: process.env.VIDEO_REVIEW_VCS_GITHUB_REPO,
    VCS_GITHUB_TOKEN: process.env.VIDEO_REVIEW_VCS_GITHUB_TOKEN,
    VCS_BRANCH: process.env.VIDEO_REVIEW_VCS_BRANCH,
} as const;
