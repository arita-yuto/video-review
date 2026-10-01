"use client"
import RevisionDiffView from "@/components/revision-diff-view";
import { useAuthStore } from "@/stores/auth-store";
import { useConfigStore } from "@/stores/config-store";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function RevisionDiffPage() {
    const router = useRouter();
    const { videoId } = useParams();
    const verifyAuth = useAuthStore((s) => s.verifyAuth);

    useEffect(() => {
        void (async () => {
            if (!(await verifyAuth())) {
                router.replace("/video-review/login");
                return;
            }
            void useConfigStore.getState().loadConfig();
        })();
    }, []);

    return (
        <div className="flex w-screen h-screen">
            <RevisionDiffView videoId={videoId as string} />
        </div>
    );
}
