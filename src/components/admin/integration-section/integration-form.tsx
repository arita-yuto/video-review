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
// Without resetConfirm there is no Reset, for integrations with no secret to lock them.
export function IntegrationForm({ title, resetConfirm, settings, children }: {
    title: string;
    resetConfirm?: string;
    settings: ReturnType<typeof useIntegrationSettings>;
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
                    {!busy && confirmReset && <span className="text-sm">{resetConfirm}</span>}
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
                        {resetConfirm && (
                            <Button variant="outline" onClick={() => setConfirmReset(true)} disabled={busy || !locked}>
                                {t("integrations.reset")}
                            </Button>
                        )}
                        <Button onClick={testAndSave} disabled={busy || !loaded}>
                            {t("integrations.testAndSave")}
                        </Button>
                    </>
                )}
            </div>
        </AdminSection>
    );
}
