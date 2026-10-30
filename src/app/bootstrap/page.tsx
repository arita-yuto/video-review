"use client"

import Bootstrap from "@/components/auth/bootstrap";
import { LanguageMenu } from "@/components/account/setting";

export default function BootstrapPage() {

    return (
        <div className="flex h-full">
            <Bootstrap />
            <LanguageMenu />
        </div>
    );
}
