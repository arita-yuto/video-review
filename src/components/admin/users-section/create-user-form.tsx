"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, readError } from "@/lib/api-client";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Button } from "@/ui/button";
import { Spinner } from "@/ui/spinner";
import { Download, Upload } from "lucide-react";
import { ImportUsersDialog } from "@/components/admin/users-section/import-users-dialog";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-types";

export function CreateUserForm({ onCreated, onImported }: {
    onCreated: (email: string) => Promise<void>;
    onImported: () => void;
}) {
    const t = useTranslations("admin-settings");

    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);

    const canSubmit = email.trim().length > 0 && password.length >= MIN_PASSWORD_LENGTH && !creating;

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;

        setCreating(true);
        setError(null);

        const createdEmail = email.trim();

        try {
            const res = await api.admin["create-user"].$post({
                json: {
                    displayName: displayName.trim() || undefined,
                    email: createdEmail,
                    pass: password,
                },
            });
            if (res.status !== 200) {
                throw new Error(await readError(res));
            }

            setDisplayName("");
            setEmail("");
            setPassword("");

            toast.success(t("users.created"));
            await onCreated(createdEmail);
        } catch (e) {
            setError(`${t("users.create.failed")}: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setCreating(false);
        }
    }

    async function onExport() {
        setError(null);
        try {
            const res = await api.admin.users.export.$get();
            if (res.status !== 200) {
                throw new Error(await readError(res));
            }

            const url = URL.createObjectURL(await res.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = "users.csv";
            link.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            setError(`${t("users.export.failed")}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    return (
        <form onSubmit={onSubmit} className="shrink-0 space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{t("users.create.title")}</h4>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => void onExport()}>
                        <Download />
                        {t("users.export.open")}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setImporting(true)}>
                        <Upload />
                        {t("users.import.open")}
                    </Button>
                </div>
            </div>
            {importing && <ImportUsersDialog onClose={() => setImporting(false)} onImported={onImported} />}

            <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                    <Label htmlFor="admin-new-user-name">{t("users.create.displayName")}</Label>
                    <Input
                        id="admin-new-user-name"
                        type="text"
                        autoComplete="off"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="admin-new-user-email">{t("users.create.email")}</Label>
                    <Input
                        id="admin-new-user-email"
                        type="email"
                        autoComplete="off"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="admin-new-user-password">{t("users.create.password")}</Label>
                    <Input
                        id="admin-new-user-password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end">
                <Button type="submit" disabled={!canSubmit}>
                    {creating ? <Spinner /> : null}
                    {t("users.create.submit")}
                </Button>
            </div>
        </form>
    );
}
