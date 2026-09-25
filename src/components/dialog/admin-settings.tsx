"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { useAuthStore } from "@/stores/auth-store";
import { isAdmin } from "@/lib/role";
import { UsersSection } from "@/components/admin/users-section";
import { ApiTokenSection } from "@/components/admin/api-token-section";
import { JiraSection } from "@/components/admin/integration-section/jira-section";
import { SlackSection } from "@/components/admin/integration-section/slack-section";
import { AiSection } from "@/components/admin/integration-section/ai-section";
import { VideosSection } from "@/components/admin/videos-section";

// Add a section by appending here. Integrations are listed under one heading.
const SECTIONS: { key: string; label: string; integration?: boolean; Component: () => React.JSX.Element | null }[] = [
    { key: "users", label: "sections.users", Component: UsersSection },
    { key: "videos", label: "sections.videos", Component: VideosSection },
    { key: "integrations.jira", label: "integrations.jira.title", integration: true, Component: JiraSection },
    { key: "integrations.slack", label: "integrations.slack.title", integration: true, Component: SlackSection },
    { key: "integrations.ai", label: "integrations.llm.title", integration: true, Component: AiSection },
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
                        {SECTIONS.map(({ key, label, integration }, i) => (
                            <Fragment key={key}>
                                {integration && !SECTIONS[i - 1]?.integration && (
                                    <span className="px-2 pt-2 text-xs text-muted-foreground">{t("sections.integrations")}</span>
                                )}
                                <TabsTrigger value={key} className={integration ? "justify-start ml-3" : "justify-start"}>
                                    {t(label)}
                                </TabsTrigger>
                            </Fragment>
                        ))}
                    </TabsList>

                    {/* Fixed height so switching sections doesn't resize the dialog; each section scrolls its own content. */}
                    {SECTIONS.map(({ key, Component }) => (
                        <TabsContent key={key} value={key} className="min-w-0 flex-1 h-120">
                            <Component />
                        </TabsContent>
                    ))}
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
