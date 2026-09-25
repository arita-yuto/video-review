"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/ui/input";
import { Switch } from "@/ui/switch";
import { FieldRow, IntegrationForm } from "@/components/admin/integration-section/integration-form";
import { useIntegrationSettings } from "@/components/admin/integration-section/use-integration-settings";

export function EmailSection() {
    const t = useTranslations("admin-settings.integrations.email");
    const settings = useIntegrationSettings("email");
    const field = (name: string) => {
        const props = settings.field(name);
        return <FieldRow label={t(name)} htmlFor={props.id}><Input {...props} /></FieldRow>;
    };
    const toggle = (name: string) => {
        const props = settings.field(name);
        return (
            <FieldRow label={t(name)} htmlFor={props.id}>
                <Switch
                    id={props.id}
                    checked={props.value === "true"}
                    onCheckedChange={(checked) => props.onChange(String(checked))}
                    disabled={props.disabled}
                />
            </FieldRow>
        );
    };

    return (
        <IntegrationForm title={t("title")} settings={settings}>
            {toggle("enable")}
            {field("host")}
            {field("port")}
            {field("from")}
            {toggle("tlsStrict")}
        </IntegrationForm>
    );
}
