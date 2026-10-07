"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Button } from "@/ui/button";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { useAvatarStore } from "@/stores/avatar-store";
import { api } from "@/lib/api-client";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Separator } from "@/ui/separator";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-types";

export default function EditUserProfileDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const MAX_SIZE = 1_000_000; // 1MB
    const t = useTranslations("edit-user-profile");
    const { setDisplayName, displayName, userId, email, provider } = useAuthStore();

    const [editDisplayName, setEditDisplayName] = useState<string>(displayName ?? "");
    const { icon, fetchAvatar } = useAvatarStore();
    const [file, setFile] = useState<File | null>(null);
    const [currentPass, setCurrentPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!email) return;

        void (async () => {
            try {
                fetchAvatar(email);
            } catch { }
        })();
    }, [email])

    const previewUrl = useMemo(() => {
        if (!email) {
            return undefined;
        }
        if (file) {
            return URL.createObjectURL(file);
        }
        return icon(email);
    }, [file, email]);

    const onSubmit = async () => {
        try {
            const errorMsg = []
            setLoading(true);
            setError(null);

            // The password fields are optional; validate them only when a change is started.
            const changingPassword = !!(currentPass || newPass || confirmPass);
            let passFields: { pass?: string; currentPass?: string } = {};
            if (changingPassword) {
                if (newPass.length < MIN_PASSWORD_LENGTH) {
                    setError(t("passwordTooShort"));
                    return;
                }
                if (newPass !== confirmPass) {
                    setError(t("passwordMismatch"));
                    return;
                }
                if (!currentPass) {
                    setError(t("currentPasswordRequired"));
                    return;
                }
                passFields = { pass: newPass, currentPass };
            }

            if (file && email) {
                const res = await api.avatar.upload.$put({ form: { email, file } });
                if (res.status !== 200) {
                    errorMsg.push((await res.json()).error);
                }
            }

            const res = await api.user.update.$patch({ json: { userId: userId ?? undefined, displayName: editDisplayName, ...passFields } });
            if (res.status === 200) {
                setDisplayName(editDisplayName);
            } else {
                const err = (await res.json()).error;
                // The owner guard also returns 403 ("forbidden"); only a password-time 403 means a bad current password.
                if (res.status === 403 && passFields.pass && err !== "forbidden") {
                    errorMsg.push(t("currentPasswordWrong"));
                } else {
                    errorMsg.push(err);
                }
            }

            if(errorMsg.length > 0) {
                setError(t("saveFailed") + ":\n" + errorMsg.join("\n"));
                return;
            }
            Close();
        } finally {
            setDisplayName(editDisplayName);
            setLoading(false);
        }
    };

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;

        if (f.size > MAX_SIZE) {
            setError(t("fileTooLarge", { size: f.size }));
            return;
        }

        setError(null);
        setFile(f);
    }

    const Close = () => {
        setCurrentPass("");
        setNewPass("");
        setConfirmPass("");
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={Close}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {t("title")}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    {/* Avatar preview */}
                    <label className="relative cursor-pointer group">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={previewUrl} />
                            <AvatarFallback>
                                {displayName}
                            </AvatarFallback>
                        </Avatar>

                        {/* Hover overlay */}
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition">
                            <span className="text-xs text-foreground">
                                {t("change")}
                            </span>
                        </div>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={onFileChange}
                            className="hidden"
                        />
                    </label>

                    {/* Hint */}
                    <div className="text-xs text-muted-foreground text-center">
                        {t("avatarHint", { max: "1MB", size: "256x256" })}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {/* Labels sit above full-width inputs so the layout holds for any label length. */}
                    <div className="w-full grid gap-2">
                        <Label htmlFor="displayName">{t("displayName")}</Label>
                        <Input id="displayName"
                            type="text"
                            value={editDisplayName ?? ""}
                            onChange={(x) => setEditDisplayName(x.target.value)} />
                    </div>

                    {/* Only a password session can change a password; jira/guest have no password identity. */}
                    {provider === "password" && (
                        <>
                            <Separator className="w-full" />

                            <div className="w-full grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
                                    <Input id="currentPassword"
                                        type="password"
                                        autoComplete="current-password"
                                        value={currentPass}
                                        onChange={(x) => setCurrentPass(x.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="newPassword">{t("newPassword")}</Label>
                                    <Input id="newPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        value={newPass}
                                        onChange={(x) => setNewPass(x.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                                    <Input id="confirmPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        value={confirmPass}
                                        onChange={(x) => setConfirmPass(x.target.value)} />
                                </div>
                            </div>
                        </>
                    )}

                </div>

                <DialogFooter>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        onClick={onSubmit}
                    >
                        {loading ? t("saving") : t("save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
