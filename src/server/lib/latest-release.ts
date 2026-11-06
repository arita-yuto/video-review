import "server-only";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { env } from "@/server/lib/env";

const RELEASES_URL = "https://api.github.com/repos/arita-yuto/video-review/releases";

export type Release = { version: string; url: string; notes: string };

let cached: { fetchedAt: number; release: Release | null } | undefined;

// [major, minor, patch, rc], the same order video-review-cli upgrade uses; a release without -rc is newer than its candidates.
function parseVersion(tag: string) {
    const match = /^v(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?$/.exec(tag);
    if (!match) {
        return undefined;
    }
    return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? Infinity : Number(match[4])];
}

// A release candidate install takes release candidates too, so one can be tried before the release ships.
export function runsReleaseCandidate() {
    return env.BUILD_VERSION.includes("-rc.");
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

type GitHubRelease = { tag_name?: unknown; html_url?: unknown; body?: unknown; draft?: unknown; prerelease?: unknown };

function toRelease(body: GitHubRelease): Release | null {
    if (typeof body.tag_name !== "string" || typeof body.html_url !== "string") {
        return null;
    }
    return { version: body.tag_name, url: body.html_url, notes: typeof body.body === "string" ? body.body : "" };
}

async function fetchLatestRelease(): Promise<Release | null> {
    try {
        // GitHub's latest release leaves pre-releases out, so a release candidate install reads the whole list.
        const url = runsReleaseCandidate() ? `${RELEASES_URL}?per_page=30` : `${RELEASES_URL}/latest`;
        const res = await fetch(url, {
            headers: { accept: "application/vnd.github+json" },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
            return null;
        }

        const body = await res.json() as GitHubRelease | GitHubRelease[];
        if (!Array.isArray(body)) {
            return toRelease(body);
        }

        const releases = body.filter((r) => r.draft !== true).map(toRelease).filter((r): r is Release => r !== null);
        return releases.reduce<Release | null>((newest, r) => (!newest || isNewerVersion(r.version, newest.version) ? r : newest), null);
    } catch {
        return null;
    }
}

// A failed fetch is kept too, so an offline server asks GitHub at most every 3 hours.
export async function getLatestRelease(): Promise<Release | null> {
    if (!cached || Date.now() - cached.fetchedAt > 3 * 60 * 60 * 1000) {
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

const installLogPath = () => path.join(process.cwd(), "logs", "upgrade.log");

// Where this server's upgrade starts in upgrade.log, so earlier upgrades' lines are not shown.
let installLogStart: number | null = null;
// A successful upgrade stops this server before the CLI ends, so an end this server sees is a failed one.
let installEnded = false;

export function installLatestRelease() {
    const cli = installCli();
    if (!cli) {
        return false;
    }

    fs.mkdirSync(/*turbopackIgnore: true*/ path.dirname(installLogPath()), { recursive: true });
    const log = fs.openSync(/*turbopackIgnore: true*/ installLogPath(), "a");
    installLogStart = fs.fstatSync(log).size;

    const args = ["upgrade", "--dir", process.cwd(), ...(runsReleaseCandidate() ? ["--prerelease"] : [])];
    installEnded = false;
    // Detached, since the upgrade stops this server before it starts the new release.
    const child = spawn(/*turbopackIgnore: true*/ cli, args, { cwd: process.cwd(), detached: true, stdio: ["ignore", log, log], windowsHide: true });
    child.on("exit", () => { installEnded = true; });
    // A CLI that cannot be started reports here instead of exiting.
    child.on("error", () => { installEnded = true; });
    child.unref();
    fs.closeSync(log);
    return true;
}

export function readInstallLog() {
    if (!fs.existsSync(/*turbopackIgnore: true*/ installLogPath())) {
        return null;
    }

    // Read as bytes: installLogStart is a byte offset and Prisma prints non-ASCII box characters.
    const bytes = fs.readFileSync(/*turbopackIgnore: true*/ installLogPath());
    let text = "";

    if (installLogStart !== null) {
        text = bytes.subarray(installLogStart).toString("utf8");
    } else {
        // A server the upgrade started finds this upgrade from its last installing line.
        const all = bytes.toString("utf8");
        const lastInstalling = [...all.matchAll(/^installing v/gm)].at(-1);
        text = lastInstalling ? all.slice(lastInstalling.index) : "";
    }

    const trimmed = text.trim();
    return trimmed === "" ? null : trimmed;
}

export function hasInstallFailed() {
    if (installEnded) {
        return true;
    }
    if (installLogStart !== null) {
        return false;
    }

    // A server the upgrade started is the target unless the upgrade went back to the previous release.
    const target = /^installing (\S+)/.exec(readInstallLog() ?? "")?.[1];
    return target !== undefined && target !== env.BUILD_VERSION;
}
