"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api, readError } from "@/lib/api-client";
import { FormDialog } from "@/components/dialog/form-dialog";
import type { User } from "@/lib/db-types";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-types";

export function ResetPasswordDialog({ user, onClose }: { user: User; onClose: () => void }) {
    const t = useTranslations("admin-settings");

    const [password, setPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit() {
        setSaving(true);
        setError(null);

        try {
            const res = await api.admin["user-password"].$patch({ json: { userId: user.id, pass: password } });
            if (res.status !== 200) {
                throw new Error(await readError(res));
            }
            onClose();
        } catch (e) {
            setError(`${t("users.resetPassword.failed")}: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setSaving(false);
        }
    }

    return (
        <FormDialog
            open
            onClose={onClose}
            title={t("users.resetPassword.title", { name: user.displayName })}
            onSubmit={onSubmit}
            submitLabel={t("users.resetPassword.submit")}
            cancelLabel={t("users.resetPassword.cancel")}
            destructive
            submitDisabled={password.length < MIN_PASSWORD_LENGTH || saving}
            cancelDisabled={saving}
            message={error ?? undefined}
        >
            <div className="grid gap-2">
                <Label htmlFor="admin-reset-password">{t("users.resetPassword.password")}</Label>
                <Input
                    id="admin-reset-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
        </FormDialog>
    );
}
