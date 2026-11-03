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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{release.version}</DialogTitle>
                    <DialogDescription>{running && t("running", { version: running })}</DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-96 text-sm">
                    <MarkdownText>{release.notes}</MarkdownText>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" asChild>
                        <a href={release.url} target="_blank" rel="noopener noreferrer">{t("viewOnGitHub")}</a>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
