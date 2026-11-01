"use client"
import VideoReview from "@/components/review/player";
import { useAuthStore } from "@/components/stores/auth-store";
import { useConfigStore } from "@/components/stores/config-store";
import { useRouter } from "next/navigation";
import { createLoginLink } from "@/lib/url";
import React, { useEffect } from "react";

export default function VideoReviewPage() {
    const router = useRouter();

    const {
        verifyAuth,
    } = useAuthStore();

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
        <div className="flex h-full">
            <VideoReview />
        </div>
    );
}
