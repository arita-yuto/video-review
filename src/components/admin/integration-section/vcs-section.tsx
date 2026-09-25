"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { FieldRow, IntegrationForm } from "@/components/admin/integration-section/integration-form";
import { useIntegrationSettings } from "@/components/admin/integration-section/use-integration-settings";

type Provider = "github";

const PROVIDERS: { value: Provider; label: string }[] = [
    { value: "github", label: "GitHub" },
];

// Each provider keeps its own settings; only the one in use is used.
export function VcsSection() {
    const [inUse, setInUse] = useState<Provider | null>(null);
    const [shown, setShown] = useState<Provider | null>(null);
    const [switchFailed, setSwitchFailed] = useState(false);

    useEffect(() => {
        void (async () => {
            const res = await api.admin.settings["vcs-provider"].$get();
            const provider = res.status === 200 ? (await res.json()).provider : null;
            setInUse(provider);
            setShown(provider ?? "github");
        })();
    }, []);

    async function use(provider: Provider) {
        try {
            const res = await api.admin.settings["vcs-provider"].$put({ json: { provider } });
            if (res.status !== 200) throw new Error();
            setInUse(provider);
            setSwitchFailed(false);
        } catch {
            setSwitchFailed(true);
        }
    }

    if (!shown) return null;
    return (
        <ProviderForm key={shown} provider={shown} inUse={inUse} switchFailed={switchFailed} onPick={(next) => { setSwitchFailed(false); setShown(next); }} onUse={() => void use(shown)} />
    );
}

function ProviderForm({ provider, inUse, switchFailed, onPick, onUse }: {
    provider: Provider;
    inUse: Provider | null;
    switchFailed: boolean;
    onPick: (provider: Provider) => void;
    onUse: () => void;
}) {
    const t = useTranslations("admin-settings.integrations.vcs");
    const settings = useIntegrationSettings(`vcs-${provider}`);
    const field = (name: string) => {
        const props = settings.field(name);
        return <FieldRow label={t(name)} htmlFor={props.id}><Input {...props} /></FieldRow>;
    };

    return (
        <IntegrationForm title={t("title")} settings={settings}>
            <FieldRow label={t("provider")} htmlFor="vcs-provider">
                <Select value={provider} onValueChange={(value) => onPick(value as Provider)}>
                    <SelectTrigger id="vcs-provider">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PROVIDERS.map(({ value, label }) => (
                            <SelectItem key={value} value={value}>
                                {value === inUse ? `${label} (${t("inUse")})` : label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={onUse} disabled={provider === inUse || !settings.connection?.configured}>
                    {t("use")}
                </Button>
            </FieldRow>

            {field("owner")}
            {field("repo")}
            {field("token")}
            {field("branch")}
            {switchFailed && <p className="text-sm text-destructive">{t("switchFailed")}</p>}
        </IntegrationForm>
    );
}
