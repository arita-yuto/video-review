"use client"
import Login from "@/components/auth/login";
import { LanguageMenu } from "@/components/account/setting";

export default function LoginPage() {
    return (
        <div className="flex h-full">
            <Login />
            <LanguageMenu />
        </div>
    );
}
