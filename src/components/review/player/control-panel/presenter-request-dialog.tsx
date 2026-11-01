"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Button } from "@/ui/button";
import type { Participant } from "@/components/review/stores/playback-store";

export function PresenterRequestDialog({ requester, onAnswer }: {
    requester: Participant;
    onAnswer: (keepPresenting: boolean) => void;
}) {
    const t = useTranslations("video-control-panel");

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) {
                    onAnswer(true);
                }
            }}
        >
            {/* No description: the title is the whole message. */}
            <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t("presenterRequest", { name: requester.name })}</DialogTitle>
                </DialogHeader>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onAnswer(true)}>
                        {t("declineRequest")}
                    </Button>
                    <Button onClick={() => onAnswer(false)}>
                        {t("acceptRequest")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
