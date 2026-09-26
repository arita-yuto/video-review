"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/ui/input";
import { Switch } from "@/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { FieldRow, IntegrationForm } from "@/components/admin/integration-section/integration-form";
import { useIntegrationSettings } from "@/components/admin/integration-section/use-integration-settings";

// The login tabs keep their English names on the login screen, so they do here too.
const LOGIN_TYPES = [
    { value: "guest", label: "Guest" },
    { value: "jira", label: "JIRA" },
    { value: "password", label: "Email & Password" },
];

export function GeneralSection() {
    const t = useTranslations("admin-settings.general");
    const settings = useIntegrationSettings("general", { saved: t("saved"), failed: t("saveFailed") });

    const allowGuest = settings.field("allowGuest");
    const loginDefaultType = settings.field("loginDefaultType");

    const text = (name: string, placeholder?: string) => {
        const props = settings.field(name);
        return <FieldRow label={t(name)} htmlFor={props.id}><Input {...props} placeholder={placeholder} /></FieldRow>;
    };

    return (
        <IntegrationForm title={t("title")} settings={settings} submitLabel={t("save")}>
            <FieldRow label={t("allowGuest")} htmlFor={allowGuest.id}>
                {/* Unset means on. */}
                <Switch
                    id={allowGuest.id}
                    checked={allowGuest.value !== "false"}
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
        </IntegrationForm>
    );
}
