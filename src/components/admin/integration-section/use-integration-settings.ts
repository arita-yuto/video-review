"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, readError } from "@/lib/api-client";
import { INTEGRATIONS, type IntegrationName } from "@/components/admin/integration-section/integrations";

type Source = "saved" | "env" | null;
type FieldState = { value: string | null; source: Source } | { configured: boolean; source: Source };
type Settings = Record<string, FieldState>;

export type Status = { ok: boolean; message: string };

export type Field = {
    name: string;
    secret: boolean;
    locked: boolean;
    value: string;
    // For a secret: whether one is set (saved or in env), since its value never comes back.
    configured: boolean;
};

function plainValue(settings: Settings, field: string) {
    const state = settings[field];
    return state && "value" in state ? state.value ?? "" : "";
}

function isConfigured(settings: Settings, field: string) {
    const state = settings[field];
    return !!state && "configured" in state && state.configured;
}

// The form starts from the plain values (saved or from env); secret inputs always start empty.
function formFrom(settings: Settings, fields: readonly string[]) {
    return Object.fromEntries(fields.map(field => [field, plainValue(settings, field)]));
}

function isSaved(settings: Settings, field: string) {
    return settings[field]?.source === "saved";
}

export function useIntegrationSettings(name: IntegrationName, onChanged: () => void) {
    const t = useTranslations("admin-settings");
    const { fields, secrets, destinations } = INTEGRATIONS[name];
    const endpoint = api.admin.settings[name];

    const [settings, setSettings] = useState<Settings | null>(null);
    const [form, setForm] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<Status | null>(null);

    function load(next: Settings) {
        setSettings(next);
        setForm(formFrom(next, fields));
    }

    useEffect(() => {
        let cancelled = false;

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

    const isSecret = (field: string) => (secrets as readonly string[]).includes(field);
    const isConnection = (field: string) => isSecret(field) || (destinations as readonly string[]).includes(field);
    const locked = !!settings && secrets.some(field => isSaved(settings, field));
    const changed = settings ? fields.filter(field => form[field] !== plainValue(settings, field)) : [];

    // A plain value can't be emptied here.
    const blocked = changed.some(field => !isSecret(field) && form[field] === "") ? t("integrations.cannotClear") : null;

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
            onChanged();
        } else {
            setStatus({ ok: false, message: t("integrations.notSaved", { error: result.error ?? "" }) });
        }
    }, "integrations.testFailed");

    const reset = () => run(async () => {
        const res = await endpoint.$delete();
        if (res.status !== 200) throw new Error(await readError(res));
        load((await res.json()) as Settings);
        onChanged();
    }, "integrations.resetFailed");

    const formFields: Field[] = settings
        ? fields.map(field => ({
            name: field,
            secret: isSecret(field),
            locked: locked && isConnection(field),
            value: form[field] ?? "",
            // Once the destination is edited, an env secret no longer applies, so don't show it as set.
            configured: isConfigured(settings, field) && !destinations.some(d => changed.includes(d)),
        }))
        : [];

    return {
        loaded: settings !== null,
        locked,
        fields: formFields,
        setValue: (field: string, value: string) => {
            // A result shown for the previous values would read as if it applied to the edited ones.
            setStatus(null);
            setForm(prev => ({ ...prev, [field]: value }));
        },
        blocked,
        busy,
        status,
        testAndSave,
        reset,
    };
}
