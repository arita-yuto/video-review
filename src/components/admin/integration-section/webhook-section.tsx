"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { FieldRow, IntegrationForm } from "@/components/admin/integration-section/integration-form";
import { useIntegrationSettings } from "@/components/admin/integration-section/use-integration-settings";

export function WebhookSection() {
    const t = useTranslations("admin-settings.integrations.webhook");
    const settings = useIntegrationSettings("webhook");
    const url = settings.field("url");
    const target = settings.field("target");

    return (
        <IntegrationForm title={t("title")} resetConfirm={t("resetConfirm")} settings={settings}>
            <FieldRow label={t("target")} htmlFor={target.id}>
                <Select value={target.value} onValueChange={target.onChange} disabled={target.disabled}>
                    <SelectTrigger id={target.id}>
                        <SelectValue placeholder={t("targetPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="slack">Slack</SelectItem>
                        <SelectItem value="teams">Teams</SelectItem>
                    </SelectContent>
                </Select>
            </FieldRow>
            <FieldRow label={t("url")} htmlFor={url.id}><Input {...url} /></FieldRow>
            <p className="text-xs text-muted-foreground">{t("testNote")}</p>
        </IntegrationForm>
    );
}
