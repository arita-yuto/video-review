import "server-only";
import { ServerError } from "@/server/lib/server-error";
import { deleteSetting, getSetting, saveSetting } from "@/server/lib/settings";
import { deleteSecretSetting, getSecretSetting, hasSavedSecret, saveSecretSetting } from "@/server/lib/settings/secret";
import type { ConfigOf, Fields, IntegrationDef, TestResultSchema } from "@/server/lib/integrations/define";

type AnyDef<F extends Fields> = IntegrationDef<F, typeof TestResultSchema>;

export type Source = "saved" | "env" | null;

export type FieldState =
    | { value: string | null; source: Source }
    | { configured: boolean; source: Source };

const keyOf = (def: { name: string }, field: string) => `${def.name}.${field}`;

// An empty env value counts as unset.
const envOf = (def: { fields: Fields }, field: string) => def.fields[field].env() || undefined;

function entries<F extends Fields>(def: AnyDef<F>) {
    return Object.entries(def.fields) as [keyof F & string, F[keyof F]][];
}

export async function getConfig<F extends Fields>(def: AnyDef<F>): Promise<ConfigOf<F>> {
    const config = {} as ConfigOf<F>;
    for (const [field, spec] of entries(def)) {
        config[field] = spec.kind === "secret"
            ? await getSecretSetting(keyOf(def, field), envOf(def, field))
            : await getSetting<string>(keyOf(def, field), envOf(def, field));
    }
    return config;
}

// Reads one non-secret value without decrypting anything, so it keeps working when the key file is gone.
export async function getPlainField<F extends Fields>(def: AnyDef<F>, field: keyof F & string) {
    if (def.fields[field].kind === "secret") {
        throw new ServerError(`${def.name}.${field} is a secret`, 500);
    }
    return getSetting<string>(keyOf(def, field), envOf(def, field));
}

export async function describeConfig<F extends Fields>(def: AnyDef<F>): Promise<Record<keyof F, FieldState>> {
    const state = {} as Record<keyof F, FieldState>;
    for (const [field, spec] of entries(def)) {
        const fromEnv = envOf(def, field);
        if (spec.kind === "secret") {
            const saved = await hasSavedSecret(keyOf(def, field));
            const source: Source = saved ? "saved" : fromEnv !== undefined ? "env" : null;
            state[field] = { configured: source !== null, source };
        } else {
            const saved = await getSetting<string>(keyOf(def, field), undefined);
            const source: Source = saved !== undefined ? "saved" : fromEnv !== undefined ? "env" : null;
            state[field] = { value: saved ?? fromEnv ?? null, source };
        }
    }
    return state;
}

// A field left out stays as it is.
export async function updateConfig<F extends Fields>(def: AnyDef<F>, update: Partial<Record<keyof F, string>>) {
    const fields = entries(def);
    const secrets = fields.filter(([, spec]) => spec.kind === "secret").map(([field]) => field);
    const movesDestination = fields.some(([field, spec]) => spec.kind === "destination" && update[field] !== undefined);

    // Someone who does not know the saved secrets must not be able to point them at a new address.
    if (movesDestination && secrets.some(field => update[field] === undefined)) {
        throw new ServerError(`enter ${secrets.join(", ")} again when changing where ${def.name} connects`, 400);
    }

    // Secrets go first: if one fails to save, no new destination is left holding the old secret.
    for (const field of secrets) {
        const value = update[field];
        if (value !== undefined) await saveSecretSetting(keyOf(def, field), value);
    }
    for (const [field, spec] of fields) {
        const value = update[field];
        if (spec.kind !== "secret" && value !== undefined) await saveSetting(keyOf(def, field), value);
    }
}

// Drops every saved value of the integration at once, so env applies again.
// Secrets go last: a half-done reset may leave a saved secret with the env destination, which the operator chose,
// but never a saved destination with the env secret, which the person who saved that destination may not know.
export async function resetConfig<F extends Fields>(def: AnyDef<F>) {
    const fields = entries(def);
    for (const [field, spec] of fields) {
        if (spec.kind !== "secret") await deleteSetting(keyOf(def, field));
    }
    for (const [field, spec] of fields) {
        if (spec.kind === "secret") await deleteSecretSetting(keyOf(def, field));
    }
}
