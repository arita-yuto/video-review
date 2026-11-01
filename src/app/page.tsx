"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/components/stores/auth-store";
import { withRetry } from "@/lib/utils";
import { LoadingBadge } from "@/components/controls/loading-badge";
import { api } from "@/api";

export default function Home() {
    const router = useRouter();
    const { verifyAuth } = useAuthStore();
    const [warmupDB, setWarmupDB] = useState<boolean>(false);

    const warmupWithRetry = async () => {
        const ret = await withRetry(async () => {
            const res = await fetch("/api/internal/warmup");
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                const err: any = new Error(`HTTP ${res.status}: ${txt}`);
                err.status = res.status;
                throw err;
            }
            const json = await res.json();
            if (!json?.status) {
                const err: any = new Error("warmup failed: status=false");
                throw err;
            }
            return true;
        }, {
            retries: 10,
        });
        return ret;
    }

    useEffect(() => {
        void (async () => {
            const result = await warmupWithRetry();
            setWarmupDB(result);

            if(result) {
                const status = await api.admin.maintenance.status.$get();
                const initialized = status.status === 200 && (await status.json()).initialized;
                if(initialized) {
                    router.replace(await verifyAuth() ? "/video-review/review" : "/login");
                } else {
                    router.replace("/bootstrap");
                }
            }
        })();
    }, [router]);

    if (!warmupDB) {
        return (
            <div className="flex flex-col h-full w-full">
                <div className="flex-1 flex items-center justify-center">
                    <LoadingBadge>Database is preparing...</LoadingBadge>
                </div>
            </div>
        );
    }
    return null;
}
