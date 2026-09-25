import "server-only";
import { ServerError } from "@/server/lib/server-error";
import { getSetting, saveSetting } from "@/server/lib/settings";
import { deleteSecretSetting, getSecretSetting, hasSavedSecret, saveSecretSetting } from "@/server/lib/settings/secret";
import type { ConfigOf, Fields, IntegrationDef, TestResultSchema } from "@/server/lib/integrations/define";

type AnyDef<F extends Fields> = IntegrationDef<F, typeof TestResultSchema>;

export type Source = "saved" | "env" | null;

export type FieldState =
    | { kind: "plain" | "destination"; value: string | null; source: Source }
    | { kind: "secret"; configured: boolean; source: Source };

const keyOf = (def: { name: string }, field: string) => `${def.name}.${field}`;

// An empty env value counts as unset.
const envOf = (def: { fields: Fields }, field: string) => def.fields[field].env() || undefined;

function entries<F extends Fields>(def: AnyDef<F>) {
    return Object.entries(def.fields) as [keyof F & string, F[keyof F]][];
}

// A destination that is saved or sent never goes with an env secret, whose value its author may not know.
async function envSecretAllowed<F extends Fields>(def: AnyDef<F>, update: Partial<Record<keyof F, string>>) {
    for (const [field, spec] of entries(def)) {
        if (spec.kind !== "destination") continue;
        if (update[field] !== undefined || await getSetting(keyOf(def, field), undefined) !== undefined) return false;
    }
    return true;
}

// A supplied value wins.
async function readConfig<F extends Fields>(def: AnyDef<F>, update: Partial<Record<keyof F, string>> = {}) {
    const envSecret = await envSecretAllowed(def, update);
    const config = {} as ConfigOf<F>;
    for (const [field, spec] of entries(def)) {
        config[field] = update[field] ?? (spec.kind === "secret"
            ? await getSecretSetting(keyOf(def, field), envSecret ? envOf(def, field) : undefined)
            : await getSetting<string>(keyOf(def, field), envOf(def, field)));
    }
    return config;
}

export const getConfig = <F extends Fields>(def: AnyDef<F>) => readConfig(def);

// No decryption, so this works even without the key file.
export async function getPlainField<F extends Fields>(def: AnyDef<F>, field: keyof F & string) {
    if (def.fields[field].kind === "secret") {
        throw new ServerError(`${def.name}.${field} is a secret`, 500);
    }
    return getSetting<string>(keyOf(def, field), envOf(def, field));
}

export async function describeConfig<F extends Fields>(def: AnyDef<F>): Promise<Record<keyof F, FieldState>> {
    const state = {} as Record<keyof F, FieldState>;
    const envSecret = await envSecretAllowed(def, {});
    for (const [field, spec] of entries(def)) {
        const fromEnv = spec.kind === "secret" && !envSecret ? undefined : envOf(def, field);
        if (spec.kind === "secret") {
            const saved = await hasSavedSecret(keyOf(def, field));
            const source: Source = saved ? "saved" : fromEnv !== undefined ? "env" : null;
            state[field] = { kind: "secret", configured: source !== null, source };
        } else {
            const saved = await getSetting<string>(keyOf(def, field), undefined);
            const source: Source = saved !== undefined ? "saved" : fromEnv !== undefined ? "env" : null;
            state[field] = { kind: spec.kind, value: saved ?? fromEnv ?? null, source };
        }
    }
    return state;
}

// While a secret is saved the connection (destination and secrets) is locked; Reset unlocks it.
async function assertUnlocked<F extends Fields>(def: AnyDef<F>, update: Partial<Record<keyof F, string>>) {
    const touchesConnection = entries(def).some(([field, spec]) => spec.kind !== "plain" && update[field] !== undefined);
    if (!touchesConnection) return;

    for (const [field, spec] of entries(def)) {
        if (spec.kind === "secret" && await hasSavedSecret(keyOf(def, field))) {
            throw new ServerError(`reset the ${def.name} connection before changing it`, 400);
        }
    }
}

export async function updateConfig<F extends Fields>(def: AnyDef<F>, update: Partial<Record<keyof F, string>>) {
    await assertUnlocked(def, update);

    for (const [field, spec] of entries(def)) {
        const value = update[field];
        if (value === undefined) continue;
        if (spec.kind === "secret") {
            await saveSecretSetting(keyOf(def, field), value);
        } else {
            await saveSetting(keyOf(def, field), value);
        }
    }
}

export async function testAndSave<F extends Fields, R extends typeof TestResultSchema>(
    def: IntegrationDef<F, R>,
    update: Partial<Record<keyof F, string>>,
) {
    await assertUnlocked(def, update);

    const config = await readConfig(def, update);
    if (!def.canTest(config)) {
        return { ok: false, error: "required settings are missing" };
    }

    const result = await def.test(config);
    if (result.ok) {
        await updateConfig(def, update);
    }
    return result;
}

// For the connection dot; uses the saved or env values, never request input.
export async function checkConnection<F extends Fields>(def: AnyDef<F>) {
    let config: ConfigOf<F>;
    try {
        config = await getConfig(def);
    } catch {
        return { configured: true, ok: false };
    }

    // Unchecked integrations report as not configured, so no dot is shown.
    if (!def.check(config) || !def.canTest(config)) {
        return { configured: false, ok: false };
    }
    return { configured: true, ok: (await def.test(config)).ok };
}

// Unlocks the connection: drops the saved secrets and keeps everything else, the destination included.
export async function resetConnection<F extends Fields>(def: AnyDef<F>) {
    for (const [field, spec] of entries(def)) {
        if (spec.kind === "secret") await deleteSecretSetting(keyOf(def, field));
    }
}
