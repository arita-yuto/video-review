"use client"
import RevisionDiffView from "@/components/revision-diff-view";
import { useAuthStore } from "@/stores/auth-store";
import { useConfigStore } from "@/stores/config-store";
import { useParams, useRouter } from "next/navigation";
import { createLoginLink } from "@/lib/url";
import React, { useEffect } from "react";

export default function RevisionDiffPage() {
    const router = useRouter();
    const { videoId } = useParams();
    const verifyAuth = useAuthStore((s) => s.verifyAuth);

    useEffect(() => {
        void (async () => {
            if (!(await verifyAuth())) {
                router.replace(createLoginLink(window.location.pathname + window.location.search));
                return;
            }
            void useConfigStore.getState().loadConfig();
        })();
    }, []);

    return (
        <div className="flex w-screen h-full">
            <RevisionDiffView videoId={videoId as string} />
        </div>
    );
}
