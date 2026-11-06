"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/ui/button";
import { ScrollArea } from "@/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { MarkdownText } from "@/components/controls/markdown-text";
import type { LatestRelease } from "@/components/hooks/use-latest-release";
import { fetchRunningVersion, useReleaseInstall } from "@/components/admin/hooks/use-release-install";

export function ReleaseDialog({ release, open, onOpenChange }: {
    release: LatestRelease;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useTranslations("release-dialog");
    const [running, setRunning] = useState<string | null>(null);
    const install = useReleaseInstall(release);

    useEffect(() => {
        if (!open) {
            return;
        }
        let cancelled = false;

        void fetchRunningVersion().then((version) => {
            if (!cancelled) {
                setRunning(version);
            }
        });

        return () => { cancelled = true; };
    }, [open]);

    // Closing while it runs would look like stopping it.
    const changeOpen = (next: boolean) => {
        if (next || !install.inProgress) {
            onOpenChange(next);
        }
    };

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{release.version}</DialogTitle>
                    <DialogDescription>
                        {install.step === "installing" && t("installing", { version: release.version })}
                        {install.step === "restarting" && t("restarting")}
                        {install.step === "failed" && t("installFailed", { version: release.version })}
                        {install.step === "done" && t("installed", { version: release.version })}
                        {install.step === "idle" && running && t("running", { version: running })}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-96 text-sm">
                    {install.log
                        ? <pre className="whitespace-pre-wrap font-mono text-xs">{install.log}</pre>
                        : <MarkdownText>{release.notes}</MarkdownText>}
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" asChild>
                        <a href={release.url} target="_blank" rel="noopener noreferrer">{t("viewOnGitHub")}</a>
                    </Button>
                    {/* The page still runs the old release's code until it loads again. */}
                    {install.step === "done" && <Button onClick={() => window.location.reload()}>{t("reload")}</Button>}
                    {release.installable && install.step !== "done" && (
                        <Button onClick={() => void install.start()} disabled={install.inProgress}>
                            {t("update")}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
