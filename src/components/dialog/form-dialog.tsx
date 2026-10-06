"use client";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Button } from "@/ui/button";

// The frame shared by form dialogs: a titled dialog whose body is a column of fields,
// closed by a cancel button and one primary action.
export function FormDialog({ open, onClose, title, onSubmit, submitLabel, cancelLabel, destructive, submitDisabled, cancelDisabled, message, children }: {
    open: boolean;
    onClose: () => void;
    title: string;
    onSubmit: () => void;
    submitLabel: string;
    cancelLabel: string;
    /** Paints the primary action red, for actions that are hard to take back. */
    destructive?: boolean;
    submitDisabled?: boolean;
    cancelDisabled?: boolean;
    /** Status or validation text shown between the fields and the buttons. */
    message?: string;
    children: ReactNode;
}) {
    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 min-w-90">{children}</div>
                {message && <div className="text-sm text-muted-foreground mt-2">{message}</div>}
                <DialogFooter>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="secondary" onClick={onClose} disabled={cancelDisabled}>{cancelLabel}</Button>
                        <Button variant={destructive ? "destructive" : "default"} onClick={onSubmit} disabled={submitDisabled}>{submitLabel}</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
