"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, readError } from "@/lib/api-client";
import { AdminSection } from "@/components/admin/admin-section";
import { Button } from "@/ui/button";
import { Label } from "@/ui/label";
import { Spinner } from "@/ui/spinner";
import { Textarea } from "@/ui/textarea";

// No connection to test: MCP runs inside the app, so this screen only holds the team's guide notes.
export function McpSection() {
    const t = useTranslations("admin-settings.integrations.mcp");
    const [notes, setNotes] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

    useEffect(() => {
        void (async () => {
            const res = await api.admin.settings["mcp-guide"].$get();
            if (res.status === 200) {
                setNotes((await res.json()).notes);
            } else {
                setStatus({ ok: false, message: `${t("loadFailed")}: ${await readError(res)}` });
            }
        })();
    }, []);

    async function save() {
        setBusy(true);
        setStatus(null);
        try {
            const res = await api.admin.settings["mcp-guide"].$put({ json: { notes: notes ?? "" } });
            if (res.status !== 200) throw new Error(await readError(res));
            setNotes((await res.json()).notes);
            setStatus({ ok: true, message: t("saved") });
        } catch (e) {
            setStatus({ ok: false, message: `${t("saveFailed")}: ${e instanceof Error ? e.message : String(e)}` });
        } finally {
            setBusy(false);
        }
    }

    return (
        <AdminSection title={t("title")}>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                {notes === null && !status && <Spinner />}
                {notes !== null && (
                    <>
                        <Label htmlFor="mcp-guide-notes">{t("notes")}</Label>
                        <p className="text-xs text-muted-foreground">{t("notesHelp")}</p>
                        <Textarea id="mcp-guide-notes" className="flex-1 min-h-0 resize-none" value={notes} onChange={(e) => { setStatus(null); setNotes(e.target.value); }} disabled={busy} />
                    </>
                )}
            </div>

            <div className="shrink-0 flex items-center gap-2 border-t pt-3">
                <div className="flex-1 min-w-0">
                    {busy && <Spinner />}
                    {!busy && status && (
                        <span className={`block text-sm truncate ${status.ok ? "text-success" : "text-destructive"}`} title={status.message}>
                            {status.message}
                        </span>
                    )}
                </div>
                <Button onClick={save} disabled={busy || notes === null}>{t("save")}</Button>
            </div>
        </AdminSection>
    );
}
