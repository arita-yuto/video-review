"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/api";
import { Button } from "@/ui/button";
import { ScrollArea } from "@/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { MarkdownText } from "@/components/controls/markdown-text";
import type { LatestRelease } from "@/components/hooks/use-latest-release";

export function ReleaseDialog({ release, open, onOpenChange }: {
    release: LatestRelease;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useTranslations("release-dialog");
    const [running, setRunning] = useState<string | null>(null);
    const [install, setInstall] = useState<"idle" | "installing" | "failed">("idle");

    useEffect(() => {
        if (!open) {
            return;
        }
        let cancelled = false;

        void (async () => {
            const res = await api.version.index.$get();
            if (!cancelled && res.status === 200) {
                setRunning((await res.json()).version);
            }
        })().catch(() => {});

        return () => { cancelled = true; };
    }, [open]);

    useEffect(() => {
        if (install !== "installing") {
            return;
        }

        // Covers the CLI's 10-minute download limit, the migrations and the minute it waits for the new server.
        const deadline = Date.now() + 15 * 60 * 1000;
        const timer = setInterval(() => {
            if (Date.now() > deadline) {
                setInstall("failed");
                return;
            }

            // The server is down for part of the upgrade, so a failed request only means not back yet.
            void (async () => {
                const res = await api.version.index.$get();
                if (res.status === 200 && (await res.json()).version === release.version) {
                    window.location.reload();
                }
            })().catch(() => {});
        }, 5000);

        return () => clearInterval(timer);
    }, [install, release.version]);

    const startInstall = async () => {
        setInstall("installing");
        const res = await api.admin["latest-release"].install.$post().catch(() => null);
        if (res?.status !== 202) {
            setInstall("failed");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{release.version}</DialogTitle>
                    <DialogDescription>
                        {install === "installing" && t("installing", { version: release.version })}
                        {install === "failed" && t("installFailed", { version: release.version })}
                        {install === "idle" && running && t("running", { version: running })}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-96 text-sm">
                    <MarkdownText>{release.notes}</MarkdownText>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" asChild>
                        <a href={release.url} target="_blank" rel="noopener noreferrer">{t("viewOnGitHub")}</a>
                    </Button>
                    {release.installable && (
                        <Button onClick={() => void startInstall()} disabled={install === "installing"}>
                            {t("update")}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
