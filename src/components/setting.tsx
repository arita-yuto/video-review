"use client";

import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faRightFromBracket, faUserEdit, faUserShield } from "@fortawesome/free-solid-svg-icons";
import { Popover, PopoverTrigger, PopoverContent } from "@/ui/popover";
import { useLocale } from "@/app/locale-provider";
import { Switch } from "@/ui/switch";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";
import { isAdmin } from "@/lib/role";
import { ControlRow } from "@/components/controls/control-row";
import { useEffect, useState } from "react";
import EditUserProfileDialog from "@/components/dialog/edit-user-profile";
import AdminSettingsDialog from "@/components/dialog/admin-settings";
import { Separator } from "@/ui/separator";
import { env } from "@/lib/env";

export function SettingPopover() {
    const t = useTranslations("setting");

    const [ isLogged, setLogged ] = useState(false);
    const { locale, setLocale } = useLocale();
    const [ editProfileOpen, setEditProfileOpen] = useState(false);
    const [ adminSettingsOpen, setAdminSettingsOpen ] = useState(false);

    const { verifyAuth, role } = useAuthStore();

    useEffect(() => {
        void (async () => {
            try {
                const auth = await verifyAuth();
                setLogged(auth !== null); 
            } catch { }
        })();
    }, [])


    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="absolute bottom-4 left-4 flex gap-2 opacity-40 hover:opacity-100 transition">
                    <Button size="icon" variant="ghost" className="relative" aria-label={t("title")}>
                        <FontAwesomeIcon icon={faGear} className="text-primary" />
                    </Button>
                </div>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-full">
                <div className="space-y-2 min-w-90">
                    <div className="text-base font-medium">
                        {t("title")}
                    </div>

                    <Separator />

                    {/* Edit profile */}
                    {ControlRow(t("editProfile"), () => {
                        return (
                            <Button variant="ghost" size="icon-round" onClick={() => { setEditProfileOpen(true); }}>
                                <FontAwesomeIcon icon={faUserEdit} />
                            </Button>
                        );
                    }, !isLogged)}

                    {/* Administration (admins) */}
                    {ControlRow(t("administration"), () => {
                        return (
                            <Button variant="ghost" size="icon-round" aria-label={t("administration")} onClick={() => { setAdminSettingsOpen(true); }}>
                                <FontAwesomeIcon icon={faUserShield} />
                            </Button>
                        );
                    }, !isLogged || !isAdmin(role))}

                    {/* Language setting */}
                    {ControlRow(t("language"), () => {
                        return (
                            <Switch
                                checked={locale === "ja"}
                                onCheckedChange={(x) =>
                                    setLocale(x ? "ja" : "en")
                                }
                            />
                        );
                    })}

                    {/* Logout */}
                    {ControlRow(t("logout"), () => {
                        return (
                            <Button variant="ghost" size="icon-round" onClick={() => useAuthStore.getState().logout()}>
                                <FontAwesomeIcon icon={faRightFromBracket} />
                            </Button>
                        );
                    }, !isLogged)}

                    <EditUserProfileDialog open={editProfileOpen} onClose={() => { setEditProfileOpen(false) }} />
                    <AdminSettingsDialog open={adminSettingsOpen} onClose={() => { setAdminSettingsOpen(false) }} />
                </div>
            </PopoverContent>
        </Popover>
    );
}
