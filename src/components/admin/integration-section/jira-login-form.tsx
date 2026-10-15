"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/ui/input";
import { FieldRow, IntegrationForm } from "@/components/admin/integration-section/integration-form";
import { useIntegrationSettings } from "@/components/admin/integration-section/use-integration-settings";

const CALLBACK_PATH = "/api/v1/auth/oauth/jira/callback";

export function JiraLoginForm() {
    const t = useTranslations("admin-settings.integrations.jira");
    const settings = useIntegrationSettings("jira-login");
    const field = (name: string) => {
        const props = settings.field(name);
        return <FieldRow label={t(name)} htmlFor={props.id}><Input {...props} /></FieldRow>;
    };

    // The URL the admin registers in Jira; the origin is only known in the browser.
    const [callbackUrl, setCallbackUrl] = useState("");
    useEffect(() => {
        setCallbackUrl(`${window.location.origin}${CALLBACK_PATH}`);
    }, []);

    return (
        <IntegrationForm title={t("loginTitle")} settings={settings}>
            <FieldRow label={t("callbackUrl")} htmlFor="integration-jira-login-callback-url">
                <Input
                    id="integration-jira-login-callback-url"
                    value={callbackUrl}
                    readOnly
                    className="select-all"
                    onFocus={(e) => e.target.select()}
                />
            </FieldRow>
            {field("clientId")}
            {field("clientSecret")}
        </IntegrationForm>
    );
}
