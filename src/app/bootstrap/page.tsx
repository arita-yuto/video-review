"use client"

import Bootstrap from "@/components/bootstrap";
import { LanguageMenu } from "@/components/setting";

export default function BootstrapPage() {

    return (
        <div className="flex h-screen">
            <Bootstrap />
            <LanguageMenu />
        </div>
    );
}
