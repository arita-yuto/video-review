"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/api";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Switch } from "@/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { FieldRow, IntegrationForm } from "@/components/admin/integration-section/integration-form";
import { useIntegrationSettings } from "@/components/admin/integration-section/use-integration-settings";

// The login tabs keep their English names on the login screen, so they do here too.
const LOGIN_TYPES = [
    { value: "guest", label: "Guest" },
    { value: "password", label: "Email & Password" },
    { value: "oidc", label: "SSO" },
];

export function GeneralSection() {
    const t = useTranslations("admin-settings.general");
    const settings = useIntegrationSettings("general", { saved: t("saved"), failed: t("saveFailed") });

    const allowGuest = settings.field("allowGuest");
    const loginDefaultType = settings.field("loginDefaultType");
    const checkUpdates = settings.field("checkUpdates");
    const [latest, setLatest] = useState<{ version: string; url: string } | null>(null);

    useEffect(() => {
        let cancelled = false;

        // A failed check shows nothing.
        void (async () => {
            const res = await api.admin["latest-release"].$get();
            if (!cancelled && res.status === 200) {
                setLatest((await res.json()).latest);
            }
        })().catch(() => {});

        return () => { cancelled = true; };
    }, []);

    const text = (name: string, placeholder?: string) => {
        const props = settings.field(name);
        return <FieldRow label={t(name)} htmlFor={props.id}><Input {...props} placeholder={placeholder} /></FieldRow>;
    };

    return (
        <IntegrationForm title={t("title")} settings={settings} submitLabel={t("save")}>
            <FieldRow label={t("allowGuest")} htmlFor={allowGuest.id}>
                <Switch
                    id={allowGuest.id}
                    checked={allowGuest.value === "true"}
                    disabled={allowGuest.disabled}
                    onCheckedChange={(checked) => allowGuest.onChange(checked ? "true" : "false")}
                />
            </FieldRow>

            <FieldRow label={t("loginDefaultType")} htmlFor={loginDefaultType.id}>
                <Select value={loginDefaultType.value || "guest"} onValueChange={loginDefaultType.onChange} disabled={loginDefaultType.disabled}>
                    <SelectTrigger id={loginDefaultType.id}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {LOGIN_TYPES.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FieldRow>

            {text("urlSchema")}
            {text("resolutionPresets", t("resolutionPresetsExample"))}
            {text("uploadChunkMb")}

            <FieldRow label={t("checkUpdates")} htmlFor={checkUpdates.id}>
                <Switch
                    id={checkUpdates.id}
                    checked={checkUpdates.value === "true"}
                    disabled={checkUpdates.disabled}
                    onCheckedChange={(checked) => checkUpdates.onChange(checked ? "true" : "false")}
                />
                {latest && (
                    <Button variant="link" size="xs" asChild>
                        <a href={latest.url} target="_blank" rel="noopener noreferrer">
                            {t("updateAvailable", { version: latest.version })}
                        </a>
                    </Button>
                )}
            </FieldRow>
        </IntegrationForm>
    );
}
