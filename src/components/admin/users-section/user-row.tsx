"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "@/app/locale-provider";
import { TableCell, TableRow } from "@/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { KeyRound } from "lucide-react";
import { IconAction } from "@/components/admin/icon-action";
import { ResetPasswordDialog } from "@/components/admin/users-section/reset-password-dialog";
import type { User } from "@/lib/db-types";
import { ASSIGNABLE_ROLES, type AssignableRole } from "@/lib/role";

export function UserRow({ user, isSelf, justAdded, onRoleChange }: {
    user: User;
    isSelf: boolean;
    justAdded: boolean;
    onRoleChange: (role: AssignableRole) => void;
}) {
    const t = useTranslations("admin-settings");
    const { locale } = useLocale();
    const [resettingPassword, setResettingPassword] = useState(false);

    return (
        <TableRow data-state={justAdded ? "selected" : undefined}>
            <TableCell>{user.displayName}</TableCell>
            <TableCell>
                {user.email ?? <span className="text-muted-foreground">-</span>}
            </TableCell>
            <TableCell>
                <Select
                    value={user.role}
                    onValueChange={(role) => onRoleChange(role as AssignableRole)}
                    // Never let an admin demote themselves, so at least one admin always remains.
                    disabled={isSelf}
                >
                    <SelectTrigger size="sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {ASSIGNABLE_ROLES.map(role => (
                            <SelectItem key={role} value={role}>
                                {t(`users.roles.${role}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </TableCell>
            <TableCell>{new Date(user.createdAt).toLocaleDateString(locale)}</TableCell>
            <TableCell className="text-right">
                {!isSelf && (
                    <IconAction
                        icon={KeyRound}
                        tooltip={t("users.resetPassword.open")}
                        label={t("users.resetPassword.label", { name: user.displayName })}
                        onClick={() => setResettingPassword(true)}
                    />
                )}
                {resettingPassword && <ResetPasswordDialog user={user} onClose={() => setResettingPassword(false)} />}
            </TableCell>
        </TableRow>
    );
}
