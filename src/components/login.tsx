"use client";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { LoginType, OAUTH_PATH } from "@/lib/auth-types";
import { useTranslations } from "next-intl";
import { Tabs } from "@/ui/tabs";
import { TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Label } from "@/ui/label";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { env } from "@/lib/env";
import { useConfigStore } from "@/stores/config-store";
import { AuthCard, AuthLayout } from "@/components/auth/auth-layout";
import { createLoginLink, parseLoginReturnUrl } from "@/lib/url";

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
    const [displayName, setDisplayName] = useState("");

    // A sign-in through a provider comes back here with the session in the cookie, or with an error.
    const finishRedirectLogin = async () => {
        const params = new URLSearchParams(window.location.search);
        // Drops the error but keeps returnUrl, so a retry still lands on the same page.
        const returnUrl = params.get("returnUrl");
        const loginPage = returnUrl ? createLoginLink(returnUrl) : "/login";

        if (params.has("error")) {
            router.replace(loginPage);
            alert(t(params.get("error") === "disabled" ? "accountDisabledMsg" : "loginFailedMsg"));
            return;
        }
        if (!params.has("session")) {
            return;
        }

        const res = await api.auth.session.$get();
        if (res.status !== 200) {
            router.replace(loginPage);
            alert(t("loginFailedMsg"));
            return;
        }
        const data = await res.json();
        setAuth(data.id, data.email, data.role, data.token, data.displayName, data.provider);
        router.replace(parseLoginReturnUrl(window.location.search));
    };

    useEffect(() => {
        setEmail(cacheEmail ?? "");
        setDisplayName(cacheDisplayName ?? "");
        void loadLoginOptions();
        void finishRedirectLogin();
    }, []);

    useEffect(() => {
        if (loginMethods === null || loginDefaultType === null) {
            return;
        }
        // Don't open on a tab that is hidden.
        setType(loginMethods.includes(loginDefaultType) ? loginDefaultType : "password");
    }, [loginMethods, loginDefaultType]);

    const requestLogin = () => {
        switch (type) {
            case "password":
                return api.auth.login.password.$post({ json: { email: email ?? "", password } });
            case "jira":
                return api.auth.login.jira.$post({ json: { email: email ?? "" } });
            default:
                return api.auth.login.guest.$post({ json: { displayName } });
        }
    };

    const handleLogin = async () => {
        try {
            const res = await requestLogin();
            if (res.status === 403 && type !== "guest") {
                alert(t("accountDisabledMsg"));
                return;
            }
            if (res.status !== 200) throw new Error("Failed to login");
            const data = await res.json();
            setAuth(data.id, data.email ?? null, data.role, data.token, data.displayName, data.provider);
            router.push(parseLoginReturnUrl(window.location.search));
        } catch (e) {
            alert(t("loginFailedMsg"));
        }
    };

    return (
        <AuthLayout title={env.PUBLIC_VIDEO_REVIEW_TITLE} backgroundImageUrl={env.PUBLIC_LOGIN_BG_URL}>
            {type && (
                <Tabs value={type} onValueChange={(val) => setType(val as LoginType)}>
                    <TabsList>
                        {loginMethods?.includes("guest") && <TabsTrigger value="guest">Guest</TabsTrigger>}
                        {loginMethods?.includes("jira") && <TabsTrigger value="jira">JIRA</TabsTrigger>}
                        {loginMethods?.includes("password") && <TabsTrigger value="password">Email & Password</TabsTrigger>}
                        {loginMethods?.includes("oidc") && <TabsTrigger value="oidc">SSO</TabsTrigger>}
                    </TabsList>
                    {loginMethods?.includes("guest") && (
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
                    {loginMethods?.includes("jira") && (
                        <TabsContent value="jira">
                            <AuthCard>
                                <div className="h-8"></div>
                                <div className="grid gap-3 mb-4">
                                    <Label htmlFor="email">{t("email")}</Label>
                                    <Input id="email"
                                        type="email"
                                        value={email ?? ""}
                                        onChange={(x) => setEmail(x.target.value)} />
                                </div>
                                <ButtonLogin exec={handleLogin} title={t("ok")} />
                            </AuthCard>
                        </TabsContent>
                    )}
                    {loginMethods?.includes("password") && (
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
                    {loginMethods?.includes("oidc") && (
                        <TabsContent value="oidc">
                            <AuthCard>
                                <div className="h-8"></div>
                                <ButtonLogin exec={() => window.location.assign(`${OAUTH_PATH}/oidc/start${window.location.search}`)} title={t("sso")} />
                            </AuthCard>
                        </TabsContent>
                    )}
                </Tabs>
            )}
        </AuthLayout>
    );
}

function ButtonLogin({ exec, title }: { exec: () => void; title: string }) {
    return (
        <Button onClick={exec} className="w-full">
            {title}
        </Button>
    );
}