import { createRoute, z } from "@hono/zod-openapi";
import { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { randomBytes, timingSafeEqual } from "crypto";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { ServerError } from "@/server/lib/server-error";
import { requestOrigin } from "@/server/lib/request-origin";
import { isHttps, setAuthCookie } from "@/server/lib/set-auth-cookie";
import { configuredOAuthProviders, finishOAuthLogin, oauthProviderNames, startOAuthLogin } from "@/server/lib/login/oauth";

const STATE_COOKIE = "video_review_oauth_state";
const LOGIN_PAGE = "/login";

const ProviderParams = z.object({ provider: z.enum(oauthProviderNames) });

function callbackUrl(c: Context, provider: string) {
    return `${requestOrigin(c.req.raw)}/api/v1/auth/oauth/${provider}/callback`;
}

function sameState(sent: string, received: string) {
    const a = Buffer.from(sent);
    const b = Buffer.from(received);
    return a.length === b.length && timingSafeEqual(a, b);
}

export const oauthRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "the sign-in providers that are set up",
        path: "/",
        responses: {
            200: {
                description: "Names of the providers the login screen may offer",
                content: { "application/json": { schema: z.object({ providers: z.array(z.string()) }) } },
            },
        },
    }), async (c) => {
        return c.json({ providers: await configuredOAuthProviders() }, 200);
    })
    .openapi(createRoute({
        method: "get",
        summary: "start a sign-in",
        description: "Sends the browser to the provider; the state travels in a short-lived cookie.",
        path: "/{provider}/start",
        request: { params: ProviderParams },
        responses: {
            302: { description: "Redirect to the provider" },
            400: errorResponse("Unknown provider"),
            401: errorResponse("The provider is not set up"),
        },
    }), async (c) => {
        const { provider } = c.req.valid("param");
        const state = randomBytes(32).toString("hex");

        setCookie(c, STATE_COOKIE, state, { httpOnly: true, sameSite: "Lax", secure: isHttps(c), path: "/", maxAge: 60 * 10 });
        return c.redirect(await startOAuthLogin(provider, { redirectUri: callbackUrl(c, provider), state }), 302);
    })
    .openapi(createRoute({
        method: "get",
        summary: "finish a sign-in",
        description: "The provider sends the browser back here; on success the auth cookie is set and the login screen picks the session up.",
        path: "/{provider}/callback",
        request: {
            params: ProviderParams,
            query: z.object({ code: z.string().optional(), state: z.string().optional() }),
        },
        responses: {
            302: { description: "Redirect to the login screen, with ?session on success or ?error on failure" },
            400: errorResponse("Unknown provider"),
        },
    }), async (c) => {
        const { provider } = c.req.valid("param");
        const { code, state } = c.req.valid("query");
        const sent = getCookie(c, STATE_COOKIE);
        deleteCookie(c, STATE_COOKIE, { path: "/" });

        if (!code || !state || !sent || !sameState(sent, state)) {
            return c.redirect(`${LOGIN_PAGE}?error=failed`, 302);
        }

        try {
            const response = await finishOAuthLogin(provider, { code, redirectUri: callbackUrl(c, provider) });
            setAuthCookie(c, response.token);
        } catch (e) {
            // The browser only sees "failed", so the cause is logged here; this path never reaches onError.
            console.error(`[auth/oauth] ${provider} login failed`, e);
            const reason = e instanceof ServerError && e.status === 403 ? "disabled" : "failed";
            return c.redirect(`${LOGIN_PAGE}?error=${reason}`, 302);
        }
        return c.redirect(`${LOGIN_PAGE}?session=1`, 302);
    });
