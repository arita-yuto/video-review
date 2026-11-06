"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CircleArrowUp, Globe, LogOut, Settings, ShieldUser, UserPen } from "lucide-react";
import { useLatestRelease } from "@/components/hooks/use-latest-release";
import { ReleaseDialog } from "@/components/admin/release-dialog";
import { Locales, useLocale } from "@/app/locale-provider";
import { useAuthStore } from "@/components/stores/auth-store";
import { isAdmin, isGuest } from "@/lib/role";
import { useIsMobile } from "@/lib/hooks/use-mobile";
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
import { AccountSummary } from "@/components/account/account-summary";
import { AccountAvatar } from "@/components/controls/account-avatar";
import EditUserProfileDialog from "@/components/account/edit-user-profile";
import AdminSettingsDialog from "@/components/admin/admin-settings";

// `compact` renders an avatar-only trigger for a title row instead of the footer row.
export function AccountMenu({ compact = false }: { compact?: boolean }) {
    const t = useTranslations("setting");
    const { verifyAuth, role, displayName, email } = useAuthStore();
    const isMobile = useIsMobile();

    const [isLogged, setLogged] = useState(false);
    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [adminSettingsOpen, setAdminSettingsOpen] = useState(false);
    const [releaseOpen, setReleaseOpen] = useState(false);

    useEffect(() => {
        void (async () => {
            try {
                setLogged((await verifyAuth()) !== null);
            } catch {
                setLogged(false);
            }
        })();
    }, []);

    const latest = useLatestRelease(isLogged && isAdmin(role));

    const menu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {compact ? (
                    <Button variant="ghost" size="icon-sm" aria-label={t("title")} className="relative">
                        <AccountAvatar email={email} className="size-6" />
                        {latest && <span className="notice-dot" />}
                    </Button>
                ) : (
                    <SidebarMenuButton size="lg" aria-label={t("title")} className="relative">
                        <AccountSummary displayName={displayName ?? ""} email={email} />
                        <Settings />
                        {latest && <span className="notice-dot" />}
                    </SidebarMenuButton>
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent side={compact ? "bottom" : "top"} align={compact ? "end" : "start"} className="w-60">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-2">
                        <AccountSummary displayName={displayName ?? ""} email={email} />
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {latest && (
                    <DropdownMenuItem onSelect={() => setReleaseOpen(true)}>
                        <CircleArrowUp />
                        {t("updateAvailable", { version: latest.version })}
                    </DropdownMenuItem>
                )}
                {isLogged && !isGuest(role) && (
                    <DropdownMenuItem onSelect={() => setEditProfileOpen(true)}>
                        <UserPen />
                        {t("editProfile")}
                    </DropdownMenuItem>
                )}
                {/* The admin screen is not laid out for a small screen. */}
                {isLogged && isAdmin(role) && !isMobile && (
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
    );

    return (
        <>
            {compact ? menu : (
                <SidebarMenu>
                    <SidebarMenuItem>{menu}</SidebarMenuItem>
                </SidebarMenu>
            )}

            {/* Outside the menu, which closes when an item is chosen. */}
            <EditUserProfileDialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
            <AdminSettingsDialog open={adminSettingsOpen} onClose={() => setAdminSettingsOpen(false)} />
            {latest && <ReleaseDialog release={latest} open={releaseOpen} onOpenChange={setReleaseOpen} />}
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
