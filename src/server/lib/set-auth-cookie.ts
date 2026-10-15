import "server-only";
import { Context } from "hono";
import { setCookie } from "hono/cookie";
import { AUTH_COOKIE } from "@/server/lib/token";
import { requestOrigin } from "@/server/lib/request-origin";

// Only mark cookies Secure over https; dev and E2E run on http, where a Secure
// cookie would never be sent and would break media playback.
export function isHttps(c: Context): boolean {
    return requestOrigin(c.req.raw).startsWith("https:");
}

export function setAuthCookie(c: Context, token: string) {
    setCookie(c, AUTH_COOKIE, token, {
        httpOnly: true,
        sameSite: "Lax",
        secure: isHttps(c),
        path: "/",
        maxAge: 60 * 60 * 24,
    });
}
