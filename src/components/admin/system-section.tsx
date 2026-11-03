"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/api";
import { AdminSection } from "@/components/admin/admin-section";
import { FieldRow } from "@/components/admin/integration-section/integration-form";
import { Button } from "@/ui/button";
import { Spinner } from "@/ui/spinner";

export function SystemSection() {
    const t = useTranslations("admin-settings.system");
    const [version, setVersion] = useState<string | null>(null);
    const [latest, setLatest] = useState<{ version: string; url: string } | null>(null);

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            const res = await api.version.index.$get();
            if (!cancelled && res.status === 200) {
                setVersion((await res.json()).version);
            }
        })().catch(() => {});

        // A failed check shows nothing.
        void (async () => {
            const res = await api.admin["latest-release"].$get();
            if (!cancelled && res.status === 200) {
                setLatest((await res.json()).latest);
            }
        })().catch(() => {});

        return () => { cancelled = true; };
    }, []);

    return (
        <AdminSection title={t("title")}>
            <FieldRow label={t("version")} htmlFor="system-version">
                <span id="system-version" className="text-sm">{version ?? <Spinner />}</span>
                {latest && (
                    <Button variant="link" size="xs" asChild>
                        <a href={latest.url} target="_blank" rel="noopener noreferrer">
                            {t("available", { version: latest.version })}
                        </a>
                    </Button>
                )}
            </FieldRow>
        </AdminSection>
    );
}
