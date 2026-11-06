"use client";

import { useEffect, useState } from "react";
import { api } from "@/api";
import type { LatestRelease } from "@/components/hooks/use-latest-release";

type InstallStep = "idle" | "installing" | "restarting" | "done" | "failed";

export function useReleaseInstall(release: LatestRelease) {
    const [step, setStep] = useState<InstallStep>("idle");
    const [log, setLog] = useState<string | null>(null);
    const inProgress = step === "installing" || step === "restarting";

    const start = async () => {
        setStep("installing");
        setLog(null);
        const res = await api.admin["latest-release"].install.$post().catch(() => null);
        if (res?.status !== 202) {
            setStep("failed");
        }
    };

    useEffect(() => {
        if (!inProgress) {
            return;
        }

        // Covers the CLI's 10-minute download limit, the migrations and the minute it waits for the new server.
        const deadline = Date.now() + 15 * 60 * 1000;
        const timer = setInterval(() => {
            if (Date.now() > deadline) {
                setStep("failed");
                return;
            }

            void (async () => {
                const answeredVersion = await fetchRunningVersion();
                // null means no answer, as between stopping the old release and starting the new one.
                if (answeredVersion === null) {
                    setStep("restarting");
                    return;
                }

                const res = await api.admin["latest-release"].install.$get().catch(() => null);
                const progress = res?.status === 200 ? await res.json() : null;
                if (progress) {
                    setLog(progress.log);
                }
                setStep(nextStep(answeredVersion, release.version, progress?.failed ?? false));
            })().catch(() => {});
        }, 3000);

        return () => clearInterval(timer);
    }, [inProgress, release.version]);

    return { step, inProgress, log, start };
}

function nextStep(answeredVersion: string, target: string, failed: boolean): InstallStep {
    // Done by the version alone: a target older than GET /install returns 404 for it.
    if (answeredVersion === target) {
        return "done";
    }
    return failed ? "failed" : "installing";
}

export async function fetchRunningVersion() {
    const res = await api.version.index.$get().catch(() => null);
    return res?.status === 200 ? (await res.json()).version : null;
}
