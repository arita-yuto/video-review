"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthCard, AuthLayout } from "@/components/auth/auth-layout";

export default function Bootstrap() {
    const t = useTranslations("bootstrap");
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const { setAuth } = useAuthStore();

    async function submit() {
        const res = await api.admin.bootstrap.$post({ json: { email, pass } });
        if (res.status !== 200) {
            alert((await res.json()).error);
            return;
        }

        try {
            const login = await api.auth.login.password.$post({ json: { email, password: pass } });
            if (login.status !== 200) throw new Error("Failed to login");
            const data = await login.json();
            setAuth(data.id, data.email ?? null, data.role, data.token, data.displayName, data.provider);
            location.href = "/";
        } catch (e) {
            alert(t("loginFailedMsg"));
        }
    }

    return (
        <AuthLayout title={t("title")}>
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
                        value={pass ?? ""}
                        onChange={(x) => setPass(x.target.value)} />
                </div>
                <Button onClick={submit} className="w-full">
                    Initialize
                </Button>
            </AuthCard>
        </AuthLayout>
    );
}
