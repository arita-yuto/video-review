import "server-only";

// Next fills request.url with its own listen address, so the address the client used comes from the headers.
export function requestOrigin(request: Request): string {
    const own = new URL(request.url);
    const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
    const host = forwarded || request.headers.get("host") || own.host;
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || own.protocol.replace(":", "");
    try {
        return new URL(`${proto}://${host}`).origin;
    } catch {
        return own.origin;
    }
}
