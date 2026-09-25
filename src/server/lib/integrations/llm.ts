import "server-only";
import { z } from "@hono/zod-openapi";
import { env } from "@/server/lib/env";
import { getSetting, saveSetting } from "@/server/lib/settings";
import { defineIntegration, HttpUrlSchema, TestResultSchema } from "@/server/lib/integrations/define";
import { getConfig } from "@/server/lib/integrations/store";

export const LLM_PROVIDERS = ["claude", "openai", "gemini", "ollama"] as const;
export type LLMProvider = (typeof LLM_PROVIDERS)[number];

// env holds one provider's settings; they only count for the provider env names.
const fromEnv = (provider: LLMProvider, value: () => string | undefined) => () =>
    env.LLM_PROVIDER === provider ? value() : undefined;

// Listing models costs no tokens, so Test & save and the connection dot are free.
async function listModels(provider: string, url: string, headers: Record<string, string>) {
    try {
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
        return res.ok ? { ok: true } : { ok: false, error: `${provider} answered ${res.status}` };
    } catch {
        return { ok: false, error: `${provider} could not be reached` };
    }
}

export const llmClaude = defineIntegration({
    name: "llm-claude",
    fields: {
        apiKey: { kind: "secret", env: fromEnv("claude", () => env.LLM_API_KEY) },
        model: { kind: "plain", env: fromEnv("claude", () => env.LLM_MODEL) },
    },
    testSchema: TestResultSchema,
    check: true,
    canTest: ({ apiKey }) => !!apiKey,
    test: async ({ apiKey }) => listModels("claude", "https://api.anthropic.com/v1/models", { "x-api-key": apiKey!, "anthropic-version": "2023-06-01" }),
});

export const llmOpenAI = defineIntegration({
    name: "llm-openai",
    fields: {
        apiKey: { kind: "secret", env: fromEnv("openai", () => env.LLM_API_KEY) },
        model: { kind: "plain", env: fromEnv("openai", () => env.LLM_MODEL) },
    },
    testSchema: TestResultSchema,
    check: true,
    canTest: ({ apiKey }) => !!apiKey,
    test: async ({ apiKey }) => listModels("openai", "https://api.openai.com/v1/models", { Authorization: `Bearer ${apiKey!}` }),
});

export const llmGemini = defineIntegration({
    name: "llm-gemini",
    fields: {
        apiKey: { kind: "secret", env: fromEnv("gemini", () => env.LLM_API_KEY) },
        model: { kind: "plain", env: fromEnv("gemini", () => env.LLM_MODEL) },
    },
    testSchema: TestResultSchema,
    check: true,
    canTest: ({ apiKey }) => !!apiKey,
    test: async ({ apiKey }) => listModels("gemini", "https://generativelanguage.googleapis.com/v1beta/openai/models", { Authorization: `Bearer ${apiKey!}` }),
});

export const llmOllama = defineIntegration({
    name: "llm-ollama",
    fields: {
        baseUrl: { kind: "destination", env: fromEnv("ollama", () => env.LLM_BASE_URL), schema: HttpUrlSchema },
        model: { kind: "plain", env: fromEnv("ollama", () => env.LLM_MODEL) },
    },
    testSchema: TestResultSchema,
    check: true,
    canTest: ({ baseUrl }) => !!baseUrl,
    test: async ({ baseUrl }) => listModels("ollama", `${baseUrl!.replace(/\/+$/, "")}/api/tags`, {}),
});

const PROVIDER_KEY = "llm.provider";

export async function getLLMProvider(): Promise<LLMProvider | undefined> {
    return getSetting<LLMProvider>(PROVIDER_KEY, env.LLM_PROVIDER);
}

export async function saveLLMProvider(provider: LLMProvider) {
    await saveSetting(PROVIDER_KEY, provider);
}

// The settings of the provider in use, in the shape the LLM client is built from.
export async function getLLMConfig() {
    const provider = await getLLMProvider();
    if (provider === "ollama") {
        const { baseUrl, model } = await getConfig(llmOllama);
        return { provider, apiKey: undefined, baseUrl, model };
    }
    if (provider) {
        const def = { claude: llmClaude, openai: llmOpenAI, gemini: llmGemini }[provider];
        const { apiKey, model } = await getConfig(def);
        return { provider, apiKey, baseUrl: undefined, model };
    }
    return { provider: undefined, apiKey: undefined, baseUrl: undefined, model: undefined };
}

export const LLMProviderSchema = z.enum(LLM_PROVIDERS);
