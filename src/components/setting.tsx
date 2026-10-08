"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Globe, LogOut, Settings, ShieldUser, UserPen } from "lucide-react";
import { Locales, useLocale } from "@/app/locale-provider";
import { useAuthStore } from "@/stores/auth-store";
import { isAdmin, isGuest } from "@/lib/role";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/ui/sidebar";
import { Button } from "@/ui/button";
import { AccountSummary } from "@/components/controls/account-summary";
import EditUserProfileDialog from "@/components/dialog/edit-user-profile";
import AdminSettingsDialog from "@/components/dialog/admin-settings";

export function AccountMenu() {
    const t = useTranslations("setting");
    const { verifyAuth, role, displayName, email } = useAuthStore();

    const [isLogged, setLogged] = useState(false);
    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [adminSettingsOpen, setAdminSettingsOpen] = useState(false);

    useEffect(() => {
        void (async () => {
            try {
                setLogged((await verifyAuth()) !== null);
            } catch {
                setLogged(false);
            }
        })();
    }, []);

    return (
        <>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton size="lg" aria-label={t("title")}>
                                <AccountSummary displayName={displayName ?? ""} email={email} />
                                <Settings />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent side="top" align="start" className="w-60">
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex items-center gap-2">
                                    <AccountSummary displayName={displayName ?? ""} email={email} />
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {isLogged && !isGuest(role) && (
                                <DropdownMenuItem onSelect={() => setEditProfileOpen(true)}>
                                    <UserPen />
                                    {t("editProfile")}
                                </DropdownMenuItem>
                            )}
                            {isLogged && isAdmin(role) && (
                                <DropdownMenuItem onSelect={() => setAdminSettingsOpen(true)}>
                                    <ShieldUser />
                                    {t("administration")}
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Globe />
                                    {t("language")}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <LanguageItems />
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            {isLogged && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => useAuthStore.getState().logout()}>
                                        <LogOut />
                                        {t("logout")}
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>

            {/* Outside the menu, which closes when an item is chosen. */}
            <EditUserProfileDialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
            <AdminSettingsDialog open={adminSettingsOpen} onClose={() => setAdminSettingsOpen(false)} />
        </>
    );
}

export function LanguageMenu() {
    const t = useTranslations("setting");

    return (
        <div className="absolute bottom-4 left-4">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t("language")}>
                        <Globe />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start">
                    <LanguageItems />
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function LanguageItems() {
    const { locale, setLocale } = useLocale();

    return (
        <DropdownMenuRadioGroup value={locale} onValueChange={setLocale}>
            {Object.entries(Locales).map(([code, { name }]) => (
                <DropdownMenuRadioItem key={code} value={code}>
                    {name}
                </DropdownMenuRadioItem>
            ))}
        </DropdownMenuRadioGroup>
    );
}
