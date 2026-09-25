"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/ui/input";
import { FieldRow, IntegrationForm } from "@/components/admin/integration-section/integration-form";
import { useIntegrationSettings } from "@/components/admin/integration-section/use-integration-settings";

export function SlackSection() {
    const t = useTranslations("admin-settings.integrations.slack");
    const settings = useIntegrationSettings("slack");
    const field = (name: string) => {
        const props = settings.input(name);
        return <FieldRow label={t(name)} htmlFor={props.id}><Input {...props} /></FieldRow>;
    };

    return (
        <IntegrationForm title={t("title")} resetConfirm={t("resetConfirm")} settings={settings}>
            {field("token")}
            {field("channel")}
            {field("team")}
        </IntegrationForm>
    );
}
