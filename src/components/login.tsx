"use client";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { LoginMethod, LoginType } from "@/lib/auth-types";
import { useTranslations } from "next-intl";
import { Tabs } from "@/ui/tabs";
import { TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Label } from "@/ui/label";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { env } from "@/lib/env";
import { useConfigStore } from "@/stores/config-store";
import { AuthCard, AuthLayout } from "@/components/auth/auth-layout";

export default function Login() {
    const t = useTranslations("login");
    const router = useRouter();

    const cacheDisplayName = useAuthStore((e) => e.displayName);
    const cacheEmail = useAuthStore((e) => e.email);
    const { setAuth } = useAuthStore();
    const { loginMethods, loginDefaultType, loadLoginOptions } = useConfigStore();

    // null until the login options are in, so the tabs never open on a guess and then jump.
    const [type, setType] = useState<LoginType | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [jiraSecret, setJiraSecret] = useState("");
    const [displayName, setDisplayName] = useState("");

    // A sign-in through a provider comes back here with the session in the cookie, or with an error.
    const finishRedirectLogin = async () => {
        const params = new URLSearchParams(window.location.search);
        if (params.has("error")) {
            router.replace("/login");
            alert(t(params.get("error") === "disabled" ? "accountDisabledMsg" : "loginFailedMsg"));
            return;
        }
        if (!params.has("session")) {
            return;
        }

        const res = await api.auth.session.$get();
        if (res.status !== 200) {
            router.replace("/login");
            alert(t("loginFailedMsg"));
            return;
        }
        const data = await res.json();
        setAuth(data.id, data.email, data.role, data.token, data.displayName, data.provider);
        router.replace("/video-review/review");
    };

    useEffect(() => {
        setEmail(cacheEmail ?? "");
        setDisplayName(cacheDisplayName ?? "");
        void loadLoginOptions();
        void finishRedirectLogin();
    }, []);

    const tabs = loginMethods ? tabsFor(loginMethods) : [];

    useEffect(() => {
        if (loginMethods === null || loginDefaultType === null) return;
        // Don't open on a tab that is hidden.
        setType(tabs.includes(loginDefaultType) ? loginDefaultType : tabs[0]);
    }, [loginMethods, loginDefaultType]);

    const requestLogin = () => {
        switch (type) {
            case "password":
                return api.auth.login.password.$post({ json: { email: email ?? "", password } });
            case "jira":
                return api.auth.login.jira.$post({ json: { email: email ?? "", secret: jiraSecret } });
            default:
                return api.auth.login.guest.$post({ json: { displayName } });
        }
    };

    const handleLogin = async () => {
        try {
            const res = await requestLogin();
            if (res.status === 403 && type !== "guest") {
                const { error } = await res.json();
                alert(t(error === "captcha" ? "jiraCaptchaMsg" : "accountDisabledMsg"));
                return;
            }
            if (res.status !== 200) throw new Error("Failed to login");
            const data = await res.json();
            setAuth(data.id, data.email ?? null, data.role, data.token, data.displayName, data.provider);
            router.push("/video-review/review");
        } catch (e) {
            alert(t("loginFailedMsg"));
        }
    };

    return (
        <AuthLayout title={env.PUBLIC_VIDEO_REVIEW_TITLE} backgroundImageUrl={env.PUBLIC_LOGIN_BG_URL}>
            {type && (
                <Tabs value={type} onValueChange={(val) => setType(val as LoginType)}>
                    <TabsList>
                        {tabs.includes("guest") && <TabsTrigger value="guest">Guest</TabsTrigger>}
                        {tabs.includes("jira") && <TabsTrigger value="jira">JIRA</TabsTrigger>}
                        {tabs.includes("password") && <TabsTrigger value="password">Email & Password</TabsTrigger>}
                    </TabsList>
                    {tabs.includes("guest") && (
                        <TabsContent value="guest">
                            <AuthCard>
                                <div className="h-8"></div>
                                <div className="grid gap-3 mb-4">
                                    <Label htmlFor="displayName">{t("displayName")}</Label>
                                    <Input id="displayName"
                                        type="text"
                                        value={displayName ?? ""}
                                        onChange={(x) => setDisplayName(x.target.value)} />
                                </div>
                                <ButtonLogin exec={handleLogin} title={t("ok")} />
                            </AuthCard>
                        </TabsContent>
                    )}
                    {tabs.includes("jira") && (
                        <TabsContent value="jira">
                            <AuthCard>
                                <div className="h-8"></div>
                                {loginMethods?.includes("jira-oauth") ? (
                                    <ButtonLogin exec={() => window.location.assign("/api/v1/auth/oauth/jira/start")} title={t("jira")} />
                                ) : (
                                    <>
                                        <div className="grid gap-3 mb-4">
                                            <Label htmlFor="email">{t("email")}</Label>
                                            <Input id="email"
                                                type="email"
                                                value={email ?? ""}
                                                onChange={(x) => setEmail(x.target.value)} />
                                        </div>
                                        <div className="grid gap-3 mb-4">
                                            <Label htmlFor="jira-secret">{t("jiraSecret")}</Label>
                                            <Input id="jira-secret"
                                                type="password"
                                                onKeyDown={(x) => x.key === "Enter" && handleLogin()}
                                                value={jiraSecret}
                                                onChange={(x) => setJiraSecret(x.target.value)} />
                                        </div>
                                        <ButtonLogin exec={handleLogin} title={t("ok")} />
                                    </>
                                )}
                            </AuthCard>
                        </TabsContent>
                    )}
                    {tabs.includes("password") && (
                        <TabsContent value="password">
                            <AuthCard>
                                <div className="grid gap-3 mb-4">
                                    <Label htmlFor="email">{t("email")}</Label>
                                    <Input type="email"
                                        value={email ?? ""}
                                        onChange={(x) => setEmail(x.target.value)} />
                                </div>
                                <div className="grid gap-3 mb-4">
                                    <Label htmlFor="password">{t("password")}</Label>
                                    <Input type="password"
                                        onKeyDown={(x) => x.key === "Enter" && handleLogin()}
                                        value={password ?? ""}
                                        onChange={(x) => setPassword(x.target.value)} />
                                </div>
                                <ButtonLogin exec={handleLogin} title={t("ok")} />
                            </AuthCard>
                        </TabsContent>
                    )}
                </Tabs>
            )}
        </AuthLayout>
    );
}

// Both Jira methods share the JIRA tab.
function tabsFor(methods: LoginMethod[]): LoginType[] {
    const types: LoginType[] = ["guest", "jira", "password"];
    return types.filter(type => methods.includes(type) || (type === "jira" && methods.includes("jira-oauth")));
}

function ButtonLogin({ exec, title }: { exec: () => void; title: string }) {
    return (
        <Button onClick={exec} className="w-full">
            {title}
        </Button>
    );
}