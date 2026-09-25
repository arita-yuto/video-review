export function createVideoCommentLink(baseURL: string, videoId: string | null, commentId: string | null): string | null {
    if (videoId === null) {
        return null;
    }
    if (commentId === null) {
        return null;
    }
    return `${baseURL}/video-review/review/${videoId}?comment=${commentId}`
}

export function createVideoTimeLink(baseURL: string, videoId: string | null, time: number): string | null {
    if (videoId === null) {
        return null;
    }
    return `${baseURL}/video-review/review/${videoId}?t=${time}`
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
