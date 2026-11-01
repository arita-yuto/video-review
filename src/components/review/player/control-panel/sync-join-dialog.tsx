"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Button } from "@/ui/button";

export function SyncJoinDialog({ onAnswer }: { onAnswer: (join: boolean) => void }) {
    const t = useTranslations("video-control-panel");

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) {
                    onAnswer(false);
                }
            }}
        >
            {/* No description: the title is the whole message. */}
            <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t("joinSync")}</DialogTitle>
                </DialogHeader>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onAnswer(false)}>
                        {t("declineJoin")}
                    </Button>
                    <Button onClick={() => onAnswer(true)}>
                        {t("acceptJoin")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
