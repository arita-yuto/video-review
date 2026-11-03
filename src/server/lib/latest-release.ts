import "server-only";

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
