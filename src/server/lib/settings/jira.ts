import "server-only";
import { env } from "@/server/lib/env";
import { ServerError } from "@/server/lib/server-error";
import { deleteSetting, getSetting, saveSetting } from "@/server/lib/settings";
import { deleteSecretSetting, getSecretSetting, hasSavedSecret, saveSecretSetting } from "@/server/lib/settings/secret";

const KEYS = {
    baseUrl: "jira.baseUrl",
    project: "jira.project",
    assignee: "jira.assignee",
} as const;

const TOKEN_KEY = "JIRA_API_TOKEN";

type PlainField = keyof typeof KEYS;

export type JiraConfig = {
    baseUrl: string | undefined;
    token: string | undefined;
    project: string | undefined;
    assignee: string | undefined;
};

export type Source = "saved" | "env" | null;

const envValue: Record<PlainField, string | undefined> = {
    baseUrl: env.JIRA_BASE_URL,
    project: env.JIRA_PROJECT,
    assignee: env.JIRA_ASSIGNEE_USER,
};

// Callers that need only the URL avoid decrypting the token, which fails if the key file is gone.
export async function getJiraBaseUrl() {
    return getSetting(KEYS.baseUrl, envValue.baseUrl);
}

export async function getJiraConfig(): Promise<JiraConfig> {
    return {
        baseUrl: await getSetting(KEYS.baseUrl, envValue.baseUrl),
        token: await getSecretSetting(TOKEN_KEY, env.JIRA_API_TOKEN),
        project: await getSetting(KEYS.project, envValue.project),
        assignee: await getSetting(KEYS.assignee, envValue.assignee),
    };
}

// What the admin screen may see: plain values with where they came from, and for the token only whether it is set.
export async function describeJiraConfig() {
    const plain = async (field: PlainField) => {
        const saved = await getSetting<string>(KEYS[field], undefined);
        const fromEnv = envValue[field] || undefined;
        const source: Source = saved !== undefined ? "saved" : fromEnv !== undefined ? "env" : null;
        return { value: saved ?? fromEnv ?? null, source };
    };

    const tokenSaved = await hasSavedSecret(TOKEN_KEY);
    const tokenSource: Source = tokenSaved ? "saved" : env.JIRA_API_TOKEN ? "env" : null;

    return {
        baseUrl: await plain("baseUrl"),
        project: await plain("project"),
        assignee: await plain("assignee"),
        token: { configured: tokenSource !== null, source: tokenSource },
    };
}

// A field left out stays as it is.
export type JiraConfigUpdate = Partial<Record<PlainField | "token", string>>;

export async function updateJiraConfig(update: JiraConfigUpdate) {
    // Someone who does not know the saved token must not be able to point it at a new address.
    if (update.baseUrl !== undefined && update.token === undefined) {
        throw new ServerError("enter the token again when changing the url", 400);
    }

    // The token goes first: if its save fails, no new URL is left holding the old token.
    if (update.token !== undefined) {
        await saveSecretSetting(TOKEN_KEY, update.token);
    }

    for (const field of Object.keys(KEYS) as PlainField[]) {
        const value = update[field];
        if (value !== undefined) {
            await saveSetting(KEYS[field], value);
        }
    }
}

// Drops every saved Jira value at once, so env applies again.
export async function resetJiraConfig() {
    for (const key of Object.values(KEYS)) {
        await deleteSetting(key);
    }
    await deleteSecretSetting(TOKEN_KEY);
}
