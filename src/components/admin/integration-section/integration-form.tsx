"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AdminSection } from "@/components/admin/admin-section";
import { Button } from "@/ui/button";
import { Label } from "@/ui/label";
import { Spinner } from "@/ui/spinner";
import type { useIntegrationSettings } from "@/components/admin/integration-section/use-integration-settings";

export function FieldRow({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
    return (
        <div className="flex items-center gap-3">
            <Label htmlFor={htmlFor} className="w-32 shrink-0">{label}</Label>
            {children}
        </div>
    );
}

// The frame every integration screen shares: its fields scroll, and the buttons stay at the bottom.
// Reset appears only while a saved secret locks the connection, since only then is there anything to reset.
// submitLabel replaces "Test & save" on a screen that has no connection to test.
export function IntegrationForm({ title, settings, submitLabel, children }: {
    title: string;
    settings: ReturnType<typeof useIntegrationSettings>;
    submitLabel?: string;
    children: ReactNode;
}) {
    const t = useTranslations("admin-settings");
    const { status, testAndSave, reset, locked, connection } = settings;
    const busy = status?.state === "busy";
    const loaded = status?.state !== "loading" && status?.state !== "loadFailed";
    const [confirmReset, setConfirmReset] = useState(false);
    const connectionLabel = connection && t(connection.ok ? "integrations.connected" : "integrations.disconnected");

    const heading = (
        <span className="flex items-center gap-2">
            {title}
            {connection?.configured && (
                <span
                    role="img"
                    aria-label={connectionLabel ?? undefined}
                    title={connectionLabel ?? undefined}
                    className={`size-2 rounded-full ${connection.ok ? "bg-success" : "bg-destructive"}`}
                />
            )}
        </span>
    );

    return (
        <AdminSection title={heading}>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                {status?.state === "loading" && <Spinner />}
                {loaded && children}
            </div>

            <div className="shrink-0 flex items-center gap-2 border-t pt-3">
                <div className="flex-1 min-w-0">
                    {busy && <Spinner />}
                    {!busy && confirmReset && <span className="text-sm">{t("integrations.resetConfirm")}</span>}
                    {!confirmReset && status && "message" in status && (
                        <span className={`block text-sm truncate ${status.state === "ok" ? "text-success" : "text-destructive"}`} title={status.message}>
                            {status.message}
                        </span>
                    )}
                </div>

                {confirmReset ? (
                    <>
                        <Button variant="ghost" onClick={() => setConfirmReset(false)} disabled={busy}>
                            {t("integrations.cancel")}
                        </Button>
                        <Button variant="destructive" onClick={async () => { await reset(); setConfirmReset(false); }} disabled={busy}>
                            {t("integrations.reset")}
                        </Button>
                    </>
                ) : (
                    <>
                        {locked && (
                            <Button variant="outline" onClick={() => setConfirmReset(true)} disabled={busy}>
                                {t("integrations.reset")}
                            </Button>
                        )}
                        <Button onClick={testAndSave} disabled={busy || !loaded}>
                            {submitLabel ?? t("integrations.testAndSave")}
                        </Button>
                    </>
                )}
            </div>
        </AdminSection>
    );
}
