"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Spinner } from "@/ui/spinner";

// Typed verbatim in every locale, so a translation can never soften the guard.
const CONFIRM_WORD = "Delete";

export type DeleteTarget = {
    videoId: string;
    title: string;
    revisions: number[];
    // Every revision goes, so the video is hidden afterwards.
    whole: boolean;
};

export function DeleteConfirmDialog({ target, busy, onConfirm, onCancel }: {
    target: DeleteTarget;
    busy: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const t = useTranslations("admin-settings");
    const [typed, setTyped] = useState("");

    return (
        <Dialog open onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("videos.delete.title")}</DialogTitle>
                    <DialogDescription>
                        {/* On its own line, so a long title wraps by itself instead of breaking the sentence. */}
                        <span className="block font-medium text-foreground wrap-break-word">{target.title}</span>
                        <span className="block">
                            {target.whole
                                ? t("videos.delete.wholeSummary")
                                : t("videos.delete.revisionSummary", { revisions: target.revisions.join(", ") })}
                        </span>
                        <span className="block">{t("videos.delete.irreversible")}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-2">
                    {/* Not a Label: it is select-none, and clicking one moves focus to the input,
                        so the word could not be selected and copied the way AWS and Grafana allow. */}
                    <p id="admin-delete-confirm-hint" className="text-sm font-medium">
                        {t.rich("videos.delete.confirmLabel", {
                            confirmWord: CONFIRM_WORD,
                            word: (chunks) => (
                                <code className="select-all rounded bg-muted px-1 font-mono">{chunks}</code>
                            ),
                        })}
                    </p>
                    <Input
                        aria-labelledby="admin-delete-confirm-hint"
                        autoComplete="off"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={busy}>
                        {t("videos.delete.cancel")}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={busy || typed !== CONFIRM_WORD}
                    >
                        {busy ? <Spinner /> : null}
                        {t("videos.delete.submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
