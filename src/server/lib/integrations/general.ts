import "server-only";
import { z } from "@hono/zod-openapi";
import { env } from "@/server/lib/env";
import type { LoginType } from "@/lib/auth-types";
import { defineIntegration, TestResultSchema } from "@/server/lib/integrations/define";
import { getPlainField } from "@/server/lib/integrations/store";

export const LOGIN_TYPES = ["guest", "jira", "password"] as const;

const DEFAULT_UPLOAD_CHUNK_MB = 16;

// What the bundled launcher (integrations/launcher) registers.
const DEFAULT_URL_SCHEMA = "videoreview://open?scene={scenePath}";

const PositiveIntSchema = z.string().regex(/^[1-9]\d*$/, "must be a positive integer");

// "480,720,1080"; empty means no downscaled variants are made.
const PresetsSchema = z.string().refine(
    value => value.trim() === "" || value.split(",").every(preset => /^[1-9]\d*$/.test(preset.trim())),
    "must be widths separated by commas",
);

// The app-wide settings that are not a connection to anything, so test always passes and
// Save on the admin screen goes through test-and-save like the integrations do.
export const general = defineIntegration({
    name: "general",
    fields: {
        allowGuest: { kind: "plain", env: () => env.ALLOW_GUEST, schema: z.enum(["true", "false"]) },
        loginDefaultType: { kind: "plain", env: () => env.LOGIN_DEFAULT_TYPE, schema: z.enum(LOGIN_TYPES) },
        // Defaults sit in env() so the screen shows them and env-only setups get them. A scheme saved
        // empty turns the open-in-editor links off.
        urlSchema: { kind: "plain", env: () => env.URL_SCHEMA || DEFAULT_URL_SCHEMA, schema: z.string() },
        resolutionPresets: { kind: "plain", env: () => env.RESOLUTION_PRESETS, schema: PresetsSchema },
        uploadChunkMb: { kind: "plain", env: () => env.UPLOAD_CHUNK_MB || String(DEFAULT_UPLOAD_CHUNK_MB), schema: PositiveIntSchema },
    },
    testSchema: TestResultSchema,
    check: () => false,
    canTest: () => true,
    test: async () => ({ ok: true }),
});

// Each reader returns one field only. The routes that hand a value to the login screen or to
// logged-in users go through these, so nothing else from the group can reach them.

// Default on for compatibility; only an explicit "false" disables guest login.
export const isGuestAllowed = async () => (await getPlainField(general, "allowGuest")) !== "false";

export async function getLoginDefaultType(): Promise<LoginType> {
    const type = await getPlainField(general, "loginDefaultType");
    return (LOGIN_TYPES as readonly string[]).includes(type ?? "") ? (type as LoginType) : "guest";
}

export const getUrlSchema = async () => (await getPlainField(general, "urlSchema")) || undefined;

export async function getResolutionPresets(): Promise<number[]> {
    const presets = await getPlainField(general, "resolutionPresets");
    return (presets ?? "").split(",").map(preset => Number(preset.trim())).filter(width => width > 0);
}

export async function getUploadChunkMb(): Promise<number> {
    const chunk = Number(await getPlainField(general, "uploadChunkMb"));
    return Number.isFinite(chunk) && chunk > 0 ? chunk : DEFAULT_UPLOAD_CHUNK_MB;
}
