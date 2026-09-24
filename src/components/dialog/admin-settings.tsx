"use client";

import { Fragment, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { useAuthStore } from "@/stores/auth-store";
import { isAdmin } from "@/lib/role";
import { api } from "@/lib/api-client";
import { UsersSection } from "@/components/admin/users-section";
import { ApiTokenSection } from "@/components/admin/api-token-section";
import { IntegrationSection } from "@/components/admin/integration-section";
import { INTEGRATIONS, type IntegrationName } from "@/components/admin/integration-section/integrations";
import { VideosSection } from "@/components/admin/videos-section";

type Connection = { configured: boolean; ok: boolean };

// Add a section by appending here. Integrations are listed under one heading, each with its connection dot.
const SECTIONS: { key: string; label: string; integration?: IntegrationName; Component?: () => React.JSX.Element }[] = [
    { key: "users", label: "sections.users", Component: UsersSection },
    { key: "videos", label: "sections.videos", Component: VideosSection },
    ...(Object.keys(INTEGRATIONS) as IntegrationName[]).map(name => ({
        key: `integrations.${name}`,
        label: `integrations.${name}.title`,
        integration: name,
    })),
    { key: "apiToken", label: "sections.apiToken", Component: ApiTokenSection },
];

export default function AdminSettingsDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const t = useTranslations("admin-settings");
    const { role } = useAuthStore();
    const [section, setSection] = useState<string>(SECTIONS[0].key);
    const [connections, setConnections] = useState<Partial<Record<IntegrationName, Connection>>>({});

    async function checkConnection(name: IntegrationName) {
        try {
            const res = await api.admin.settings[name].status.$get();
            const connection = res.status === 200 ? (await res.json()) as Connection : undefined;
            setConnections(prev => ({ ...prev, [name]: connection }));
        } catch {
            // No dot is better than a wrong one.
            setConnections(prev => ({ ...prev, [name]: undefined }));
        }
    }

    useEffect(() => {
        if (!open || !isAdmin(role)) return;
        for (const name of Object.keys(INTEGRATIONS) as IntegrationName[]) void checkConnection(name);
    }, [open, role]);

    // Belt and braces: the popover gates the entry, the server gates the routes.
    if (!isAdmin(role)) return null;

    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent className="sm:max-w-5xl" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                </DialogHeader>

                {/* min-w-0: without it this grid item grows to its content and the sections overflow the dialog. */}
                <Tabs orientation="vertical" value={section} onValueChange={setSection} className="flex-row min-w-0">
                    <TabsList className="flex-col h-auto w-44 mr-4 shrink-0 self-start items-stretch">
                        {SECTIONS.map(({ key, label, integration }, i) => {
                            const connection = integration ? connections[integration] : undefined;

                            return (
                                <Fragment key={key}>
                                    {integration && !SECTIONS[i - 1]?.integration && (
                                        <span className="px-2 pt-2 text-xs text-muted-foreground">{t("sections.integrations")}</span>
                                    )}
                                    <TabsTrigger value={key} className={integration ? "justify-start ml-3" : "justify-start"}>
                                        {t(label)}
                                        {connection?.configured && (
                                            <span
                                                role="img"
                                                aria-label={t(connection.ok ? "integrations.connected" : "integrations.disconnected")}
                                                title={t(connection.ok ? "integrations.connected" : "integrations.disconnected")}
                                                className={`ml-auto size-2 rounded-full ${connection.ok ? "bg-success" : "bg-destructive"}`}
                                            />
                                        )}
                                    </TabsTrigger>
                                </Fragment>
                            );
                        })}
                    </TabsList>

                    {/* Fixed height so switching sections doesn't resize the dialog; each section scrolls its own content. */}
                    {SECTIONS.map(({ key, integration, Component }) => (
                        <TabsContent key={key} value={key} className="min-w-0 flex-1 h-120">
                            {integration
                                ? <IntegrationSection name={integration} onChanged={() => void checkConnection(integration)} />
                                : Component && <Component />}
                        </TabsContent>
                    ))}
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
