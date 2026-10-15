"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { JiraIssuesForm } from "@/components/admin/integration-section/jira-issues-form";
import { JiraLoginForm } from "@/components/admin/integration-section/jira-login-form";

// Two connections to the same Jira: the service token that files issues, and the OAuth client people sign in with.
export function JiraSection() {
    const t = useTranslations("admin-settings.integrations.jira");

    return (
        <Tabs defaultValue="issues" className="h-full min-h-0">
            <TabsList>
                <TabsTrigger value="issues">{t("issues")}</TabsTrigger>
                <TabsTrigger value="login">{t("login")}</TabsTrigger>
            </TabsList>
            <TabsContent value="issues" className="min-h-0"><JiraIssuesForm /></TabsContent>
            <TabsContent value="login" className="min-h-0"><JiraLoginForm /></TabsContent>
        </Tabs>
    );
}
