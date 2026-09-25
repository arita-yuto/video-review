"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/ui/input";
import { FieldRow, IntegrationForm } from "@/components/admin/integration-section/integration-form";
import { useIntegrationSettings } from "@/components/admin/integration-section/use-integration-settings";

export function JiraSection() {
    const t = useTranslations("admin-settings.integrations.jira");
    const settings = useIntegrationSettings("jira");
    const field = (name: string) => {
        const props = settings.field(name);
        return <FieldRow label={t(name)} htmlFor={props.id}><Input {...props} /></FieldRow>;
    };

    return (
        <IntegrationForm title={t("title")} settings={settings}>
            {field("baseUrl")}
            {field("token")}
            {field("project")}
            {field("assignee")}
            {field("issueTypeTask")}
            {field("issueTypeBug")}
        </IntegrationForm>
    );
}
