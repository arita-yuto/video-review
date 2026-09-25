"use client"
import VideoReview from "@/components/video-review";
import { useAuthStore } from "@/stores/auth-store";
import { useConfigStore } from "@/stores/config-store";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function VideoReviewPage() {
    const router = useRouter();

    const {
        verifyAuth,
    } = useAuthStore();

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
        <div className="flex h-screen">
            <VideoReview />
        </div>
    );
}
