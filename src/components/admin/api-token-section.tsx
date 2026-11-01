"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, readError } from "@/api";
import { AdminSection } from "@/components/admin/admin-section";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Spinner } from "@/ui/spinner";

export function ApiTokenSection() {
    const t = useTranslations("admin-settings");
    const [configured, setConfigured] = useState<boolean | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            try {
                const res = await api.admin.maintenance["api-token"].status.$get();
                if (res.status !== 200) throw new Error(await readError(res));

                const { configured } = await res.json();
                if (!cancelled) setConfigured(configured);
            } catch (e) {
                if (!cancelled) setError(`${t("apiToken.loadFailed")}: ${e instanceof Error ? e.message : String(e)}`);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    async function onRotate() {
        setBusy(true);
        setError(null);
        try {
            const res = await api.admin.maintenance["api-token"].rotate.$post();
            if (res.status !== 200) throw new Error(await readError(res));
            setToken((await res.json()).token);
            setConfigured(true);
        } catch (e) {
            setError(`${t("apiToken.failed")}: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setBusy(false);
        }
    }

    return (
        <AdminSection title={t("sections.apiToken")}>
            <p className="shrink-0 text-sm text-muted-foreground">{t("apiToken.description")}</p>

            <div className="shrink-0 flex items-center justify-between gap-4">
                <span className="text-sm">
                    {configured === null
                        ? <Spinner />
                        : configured ? t("apiToken.configured") : t("apiToken.notConfigured")}
                </span>
                <Button onClick={onRotate} disabled={busy || configured === null}>
                    {busy ? <Spinner /> : null}
                    {configured ? t("apiToken.regenerate") : t("apiToken.generate")}
                </Button>
            </div>

            {token && (
                <div className="shrink-0 space-y-2">
                    <Input
                        value={token}
                        readOnly
                        className="select-all font-mono text-xs"
                        onFocus={(e) => e.target.select()}
                    />
                    <p className="text-xs text-muted-foreground">{t("apiToken.newTokenHint")}</p>
                </div>
            )}

            {error && <p className="shrink-0 text-sm text-destructive">{error}</p>}
        </AdminSection>
    );
}
