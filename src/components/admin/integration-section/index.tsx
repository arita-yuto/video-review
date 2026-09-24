"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminSection } from "@/components/admin/admin-section";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Spinner } from "@/ui/spinner";
import type { IntegrationName } from "@/components/admin/integration-section/integrations";
import { useIntegrationSettings } from "@/components/admin/integration-section/use-integration-settings";

// The same fixed mask for every set secret, so it never hints at the secret's length.
const SECRET_MASK = "********";

export function IntegrationSection({ name, onChanged }: { name: IntegrationName; onChanged: () => void }) {
    const t = useTranslations("admin-settings");
    const { loaded, locked, fields, setValue, blocked, busy, status, testAndSave, reset } = useIntegrationSettings(name, onChanged);
    const [confirmReset, setConfirmReset] = useState(false);

    return (
        <AdminSection title={t(`integrations.${name}.title`)}>
            {/* The fields scroll on their own, so the buttons below always stay at the bottom. */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                {!loaded && !status && <Spinner />}

                {fields.map(field => {
                    const id = `integration-${name}-${field.name}`;
                    const placeholder = field.secret && field.configured ? SECRET_MASK : undefined;

                    return (
                        <div key={field.name} className="flex items-center gap-3">
                            <Label htmlFor={id} className="w-32 shrink-0">{t(`integrations.${name}.${field.name}`)}</Label>
                            <Input
                                id={id}
                                type={field.secret ? "password" : "text"}
                                // "off" is ignored for passwords; without this the browser fills the admin's own login password in.
                                autoComplete={field.secret ? "new-password" : "off"}
                                disabled={busy || field.locked}
                                value={field.value}
                                placeholder={placeholder}
                                onChange={(e) => setValue(field.name, e.target.value)}
                            />
                        </div>
                    );
                })}

                {blocked && <p className="text-sm text-warning">{blocked}</p>}
            </div>

            <div className="shrink-0 flex items-center gap-2 border-t pt-3">
                <div className="flex-1 min-w-0">
                    {busy && <Spinner />}
                    {!busy && confirmReset && <span className="text-sm">{t(`integrations.${name}.resetConfirm`)}</span>}
                    {!busy && !confirmReset && status && (
                        <span className={`block text-sm truncate ${status.ok ? "text-success" : "text-destructive"}`} title={status.message}>
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
                        <Button variant="outline" onClick={() => setConfirmReset(true)} disabled={busy || !locked}>
                            {t("integrations.reset")}
                        </Button>
                        <Button onClick={testAndSave} disabled={busy || !loaded || blocked !== null}>
                            {t("integrations.testAndSave")}
                        </Button>
                    </>
                )}
            </div>
        </AdminSection>
    );
}
