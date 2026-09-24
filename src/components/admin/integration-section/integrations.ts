// The fields each integration shows, in order. Secrets and destinations form the connection,
// which is locked once a secret is saved and unlocked by Reset (the server enforces this too).
export const INTEGRATIONS = {
    jira: {
        fields: ["baseUrl", "token", "project", "assignee", "issueTypeTask", "issueTypeBug"],
        secrets: ["token"],
        destinations: ["baseUrl"],
    },
    slack: {
        fields: ["token", "channel", "team"],
        secrets: ["token"],
        destinations: [],
    },
} as const;

export type IntegrationName = keyof typeof INTEGRATIONS;
