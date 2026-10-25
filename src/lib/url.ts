// The review page's sync session lives in this query parameter, so a reload stays in it.
export const SYNC_PARAM = "sync";
// The shared link asks before joining, so the click that answers also lets the browser play.
export const JOIN_PARAM = "join";

export function createVideoSyncLink(baseURL: string, videoId: string): string {
    return `${baseURL}/video-review/review/${videoId}?${SYNC_PARAM}=1`;
}

export function createVideoJoinLink(baseURL: string, videoId: string): string {
    return `${baseURL}/video-review/review/${videoId}?${JOIN_PARAM}=1`;
}

export function createLoginLink(returnPath: string): string {
    return `/login?returnUrl=${encodeURIComponent(returnPath)}`;
}

// Only a page of this app; anything else falls back to the list, so the link cannot send people elsewhere.
export function parseLoginReturnUrl(search: string): string {
    const base = "http://video-review.invalid";
    const url = new URL(new URLSearchParams(search).get("returnUrl") ?? "", base);
    if (url.origin === base && url.pathname.startsWith("/video-review/")) {
        return url.pathname + url.search;
    }
    return "/video-review/review";
}

export function createVideoCommentLink(baseURL: string, videoId: string | null, commentId: string | null): string | null {
    if (videoId === null) {
        return null;
    }
    if (commentId === null) {
        return null;
    }
    return `${baseURL}/video-review/review/${videoId}?comment=${commentId}`
}

export function createVideoTimeLink(baseURL: string, videoId: string | null, time: number, revisionId?: string): string | null {
    if (videoId === null) {
        return null;
    }
    const revision = revisionId ? `&revision=${revisionId}` : "";
    return `${baseURL}/video-review/review/${videoId}?t=${time}${revision}`
}

// template is the General settings' URL scheme, passed in because the server and the client read it from different places.
export function createOpenSceneLink(template: string | null | undefined, scenePath: string): string | null {
    if (!template) {
        return null;
    }
    if (template.includes("{scenePath}")) {
        return template.replace("{scenePath}", scenePath);
    }
    const sep = template.endsWith("/") ? "" : "/";
    return `${template}${sep}${scenePath}`;
}

export function createVideoEventLink(baseURL: string, videoId: string | null, videoRevId: string | null, eventId: string | null): string | null {
    if (videoId === null || videoRevId === null || eventId === null) {
        return null;
    }
    return `${baseURL}/video-review/review/${videoId}?revision=${videoRevId}&event=${eventId}`;
}
