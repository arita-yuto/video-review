import { useTranslations } from "next-intl";
import { CircleAlert, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Button } from "@/ui/button";

type Props = {
    message: string;
    onClose: () => void;
    // Given when the move waits for a yes, such as before folders are emptied.
    onConfirm?: () => void;
};

export function MoveDialog({ message, onClose, onConfirm }: Props) {
    const t = useTranslations("video-list-panel.organize.move");

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        {onConfirm ? <TriangleAlert className="size-5 text-destructive" /> : <CircleAlert className="size-5 text-info" />}
                        <DialogTitle>{t("title")}</DialogTitle>
                    </div>
                    <DialogDescription>{message}</DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    {onConfirm ? (
                        <>
                            <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
                            <Button variant="destructive" onClick={onConfirm}>{t("confirm")}</Button>
                        </>
                    ) : (
                        <Button onClick={onClose}>{t("close")}</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
