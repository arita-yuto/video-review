"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, readError } from "@/lib/api-client";

// The settings routes, taken from the typed API client; the *-provider routes pick a provider and aren't integrations.
export type IntegrationName = Exclude<keyof typeof api.admin.settings, "llm-provider" | "vcs-provider">;

type Source = "saved" | "env" | null;
type FieldState =
    | { kind: "plain" | "destination"; value: string | null; source: Source }
    | { kind: "secret"; configured: boolean; source: Source };
type Settings = Record<string, FieldState>;

// One value for what the screen is doing: loading, running an action, or showing how the last one ended.
// null once loaded with nothing to report.
export type Status =
    | { state: "loading" | "busy" }
    | { state: "ok" | "error" | "loadFailed"; message: string }
    | null;
export type Connection = { configured: boolean; ok: boolean };

// The same fixed mask for every set secret, so it never hints at the secret's length.
const SECRET_MASK = "********";

const valueOf = (state: FieldState | undefined) => (state && "value" in state ? state.value ?? "" : "");

export function useIntegrationSettings(name: IntegrationName) {
    const t = useTranslations("admin-settings");
    const endpoint = api.admin.settings[name];

    const [settings, setSettings] = useState<Settings | null>(null);
    const [form, setForm] = useState<Record<string, string>>({});
    const [status, setStatus] = useState<Status>({ state: "loading" });
    const [connection, setConnection] = useState<Connection | null>(null);

    function load(next: Settings) {
        setStatus(null);
        setSettings(next);
        setForm(Object.fromEntries(Object.entries(next).map(([field, state]) => [field, valueOf(state)])));
    }

    async function checkConnection() {
        try {
            const res = await endpoint.status.$get();
            setConnection(res.status === 200 ? (await res.json()) as Connection : null);
        } catch {
            setConnection(null);
        }
    }

    useEffect(() => {
        let cancelled = false;
        void checkConnection();

        void (async () => {
            try {
                const res = await endpoint.$get();
                if (res.status !== 200) throw new Error(await readError(res));
                const next = (await res.json()) as Settings;
                if (!cancelled) load(next);
            } catch (e) {
                if (!cancelled) setStatus({ state: "loadFailed", message: `${t("integrations.loadFailed")}: ${e instanceof Error ? e.message : String(e)}` });
            }
        })();

        return () => { cancelled = true; };
    }, [name]);

    const fields = settings ? Object.keys(settings) : [];
    const changed = fields.filter(field => form[field] !== valueOf(settings?.[field]));
    const locked = fields.some(field => settings?.[field].kind === "secret" && settings[field].source === "saved");
    const destinationEdited = changed.some(field => settings?.[field].kind === "destination");

    async function run(action: () => Promise<void>, failure: string) {
        setStatus({ state: "busy" });
        try {
            await action();
        } catch (e) {
            setStatus({ state: "error", message: `${t(failure)}: ${e instanceof Error ? e.message : String(e)}` });
        }
    }

    // Tests the form's values first; the server saves them only when the test passes.
    const testAndSave = () => run(async () => {
        const res = await endpoint["test-and-save"].$post({ json: Object.fromEntries(changed.map(field => [field, form[field]])) });
        if (res.status !== 200) throw new Error(await readError(res));

        const { result, state } = (await res.json()) as { result: { ok: boolean; error?: string }; state: Settings };
        if (result.ok) {
            load(state);
            setStatus({ state: "ok", message: t("integrations.saved") });
            void checkConnection();
        } else {
            setStatus({ state: "error", message: t("integrations.notSaved", { error: result.error ?? "" }) });
        }
    }, "integrations.testFailed");

    const reset = () => run(async () => {
        const res = await endpoint.$delete();
        if (res.status !== 200) throw new Error(await readError(res));
        load((await res.json()) as Settings);
        void checkConnection();
    }, "integrations.resetFailed");

    function field(field: string) {
        const state = settings?.[field];
        const secret = state?.kind === "secret";
        // Once the destination is edited an env secret no longer applies, so don't show it as set.
        const masked = secret && state.configured && !destinationEdited;

        return {
            id: `integration-${name}-${field}`,
            type: secret ? "password" : "text",
            // "off" is ignored for passwords; without this the browser fills the admin's own login password in.
            autoComplete: secret ? "new-password" : "off",
            value: form[field] ?? "",
            placeholder: masked ? SECRET_MASK : undefined,
            disabled: status?.state === "busy" || (locked && state?.kind !== "plain"),
            // Takes the event from an Input, or the value from a Select or Switch.
            onChange: (e: React.ChangeEvent<HTMLInputElement> | string) => {
                // A result shown for the previous values would read as if it applied to the edited ones.
                setStatus(null);
                setForm(prev => ({ ...prev, [field]: typeof e === "string" ? e : e.target.value }));
            },
        };
    }

    return { field, status, testAndSave, reset, locked, connection };
}
