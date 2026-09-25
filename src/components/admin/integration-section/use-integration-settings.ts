"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, readError } from "@/lib/api-client";

export type IntegrationName = "jira" | "slack";

type Source = "saved" | "env" | null;
type FieldState =
    | { kind: "plain" | "destination"; value: string | null; source: Source }
    | { kind: "secret"; configured: boolean; source: Source };
type Settings = Record<string, FieldState>;

export type Status = { ok: boolean; message: string };
export type Connection = { configured: boolean; ok: boolean };

// The same fixed mask for every set secret, so it never hints at the secret's length.
const SECRET_MASK = "********";

const valueOf = (state: FieldState | undefined) => (state && "value" in state ? state.value ?? "" : "");

export function useIntegrationSettings(name: IntegrationName) {
    const t = useTranslations("admin-settings");
    const endpoint = api.admin.settings[name];

    const [settings, setSettings] = useState<Settings | null>(null);
    const [form, setForm] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<Status | null>(null);
    const [connection, setConnection] = useState<Connection | null>(null);

    function load(next: Settings) {
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
                if (!cancelled) setStatus({ ok: false, message: `${t("integrations.loadFailed")}: ${e instanceof Error ? e.message : String(e)}` });
            }
        })();

        return () => { cancelled = true; };
    }, [name]);

    const fields = settings ? Object.keys(settings) : [];
    const changed = fields.filter(field => form[field] !== valueOf(settings?.[field]));
    const locked = fields.some(field => settings?.[field].kind === "secret" && settings[field].source === "saved");
    const destinationEdited = changed.some(field => settings?.[field].kind === "destination");
    const blocked = changed.some(field => settings?.[field].kind !== "secret" && form[field] === "") ? t("integrations.cannotClear") : null;

    async function run(action: () => Promise<void>, failure: string) {
        setBusy(true);
        setStatus(null);
        try {
            await action();
        } catch (e) {
            setStatus({ ok: false, message: `${t(failure)}: ${e instanceof Error ? e.message : String(e)}` });
        } finally {
            setBusy(false);
        }
    }

    // Tests the form's values first; the server saves them only when the test passes.
    const testAndSave = () => run(async () => {
        const res = await endpoint["test-and-save"].$post({ json: Object.fromEntries(changed.map(field => [field, form[field]])) });
        if (res.status !== 200) throw new Error(await readError(res));

        const { result, state } = (await res.json()) as { result: { ok: boolean; error?: string }; state: Settings };
        if (result.ok) {
            load(state);
            setStatus({ ok: true, message: t("integrations.saved") });
            setConnection({ configured: true, ok: true });
        } else {
            setStatus({ ok: false, message: t("integrations.notSaved", { error: result.error ?? "" }) });
        }
    }, "integrations.testFailed");

    const reset = () => run(async () => {
        const res = await endpoint.$delete();
        if (res.status !== 200) throw new Error(await readError(res));
        load((await res.json()) as Settings);
        void checkConnection();
    }, "integrations.resetFailed");

    function input(field: string) {
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
            disabled: busy || (locked && state?.kind !== "plain"),
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                // A result shown for the previous values would read as if it applied to the edited ones.
                setStatus(null);
                const value = e.target.value;
                setForm(prev => ({ ...prev, [field]: value }));
            },
        };
    }

    return { loaded: settings !== null, locked, connection, input, blocked, busy, status, testAndSave, reset };
}
