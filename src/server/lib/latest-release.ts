import "server-only";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { env } from "@/server/lib/env";

const LATEST_RELEASE_URL = "https://api.github.com/repos/arita-yuto/video-review/releases/latest";

export type Release = { version: string; url: string; notes: string };

let cached: { fetchedAt: number; release: Release | null } | undefined;

// Only plain release tags compare; dev and pre-release tags never count as older or newer.
function parseVersion(tag: string) {
    const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tag);
    return match ? match.slice(1).map(Number) : undefined;
}

export function isNewerVersion(latest: string, current: string) {
    const latestParts = parseVersion(latest);
    const currentParts = parseVersion(current);
    if (!latestParts || !currentParts) {
        return false;
    }

    for (let i = 0; i < latestParts.length; i++) {
        if (latestParts[i] !== currentParts[i]) {
            return latestParts[i] > currentParts[i];
        }
    }
    return false;
}

async function fetchLatestRelease(): Promise<Release | null> {
    try {
        const res = await fetch(LATEST_RELEASE_URL, {
            headers: { accept: "application/vnd.github+json" },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
            return null;
        }

        const body = await res.json() as { tag_name?: unknown; html_url?: unknown; body?: unknown };
        if (typeof body.tag_name !== "string" || typeof body.html_url !== "string") {
            return null;
        }
        return { version: body.tag_name, url: body.html_url, notes: typeof body.body === "string" ? body.body : "" };
    } catch {
        return null;
    }
}

// A failed fetch is kept too, so an offline server asks GitHub at most once a day.
export async function getLatestRelease(): Promise<Release | null> {
    if (!cached || Date.now() - cached.fetchedAt > 24 * 60 * 60 * 1000) {
        cached = { fetchedAt: Date.now(), release: await fetchLatestRelease() };
    }
    return cached.release;
}

// start.js runs the server from the install folder, where only a zip install has the running release's video-review-cli.
function installCli() {
    const cli = path.join(process.cwd(), "releases", env.BUILD_VERSION, process.platform === "win32" ? "video-review-cli.exe" : "video-review-cli");
    return fs.existsSync(/*turbopackIgnore: true*/ cli) ? cli : null;
}

export function canInstallRelease() {
    return installCli() !== null;
}

// Detached, since the upgrade stops this server before it starts the new release.
export function installLatestRelease() {
    const cli = installCli();
    if (!cli) {
        return false;
    }

    const logs = path.join(process.cwd(), "logs");
    fs.mkdirSync(/*turbopackIgnore: true*/ logs, { recursive: true });
    const log = fs.openSync(/*turbopackIgnore: true*/ path.join(logs, "upgrade.log"), "a");

    spawn(/*turbopackIgnore: true*/ cli, ["upgrade", "--dir", process.cwd()], { cwd: process.cwd(), detached: true, stdio: ["ignore", log, log], windowsHide: true }).unref();
    fs.closeSync(log);
    return true;
}
