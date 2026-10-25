"use client";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";

interface ShareLinkDialogProps {
    url: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ShareLinkDialog({ url, open, onOpenChange }: ShareLinkDialogProps) {
    const t = useTranslations("share-link");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>
                        {t("helperText")}
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    <Input
                        value={url}
                        readOnly
                        className="select-all"
                        onFocus={(e) => e.target.select()}
                    />
                </div>

                <div className="mt-4 flex justify-center">
                    {/* Dark on white whatever the theme, with the quiet zone scanners need around the code. */}
                    <div className="rounded-md bg-white p-3">
                        <QRCode value={url} className="size-40" />
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <DialogClose asChild>
                        <Button>{t("close")}</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
