import { createRoute, z } from "@hono/zod-openapi";
import { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { ServerError } from "@/server/lib/server-error";
import { requestOrigin } from "@/server/lib/request-origin";
import { OAUTH_PATH } from "@/lib/auth-types";
import { isHttps, setAuthCookie } from "@/server/lib/set-auth-cookie";
import { configuredOAuthProviders, finishOAuthLogin, oauthProviderNames, startOAuthLogin } from "@/server/lib/login/oauth";

const STATE_COOKIE = "video_review_oauth_state";
const VERIFIER_COOKIE = "video_review_oauth_verifier";
const RETURN_URL_COOKIE = "video_review_oauth_return_url";
const LOGIN_PAGE = "/login";

const ProviderParams = z.object({ provider: z.enum(oauthProviderNames) });

function callbackUrl(c: Context, provider: string) {
    return `${requestOrigin(c.req.raw)}${OAUTH_PATH}/${provider}/callback`;
}

function sameState(sent: string, received: string) {
    const a = Buffer.from(sent);
    const b = Buffer.from(received);
    return a.length === b.length && timingSafeEqual(a, b);
}

// PKCE: the provider gets a hash of the verifier now and the verifier itself when the code is exchanged.
function codeChallenge(verifier: string) {
    return createHash("sha256").update(verifier).digest("base64url");
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
        description: "Sends the browser to the provider; the state and the PKCE verifier travel in short-lived cookies.",
        path: "/{provider}/start",
        request: {
            params: ProviderParams,
            query: z.object({ returnUrl: z.string().optional() }),
        },
        responses: {
            302: { description: "Redirect to the provider; to the login screen with ?error=failed when the provider is not set up or cannot be reached" },
            400: errorResponse("Unknown provider"),
        },
    }), async (c) => {
        const { provider } = c.req.valid("param");
        const { returnUrl } = c.req.valid("query");
        const returnQuery = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : "";

        const state = randomBytes(32).toString("hex");
        const verifier = randomBytes(32).toString("base64url");

        let location: string;
        try {
            location = await startOAuthLogin(provider, { redirectUri: callbackUrl(c, provider), state, codeChallenge: codeChallenge(verifier) });
        } catch (e) {
            // The browser is mid-navigation, so it gets the login screen's error instead of a JSON body.
            console.error(`[auth/oauth] ${provider} start failed`, e);
            return c.redirect(`${LOGIN_PAGE}?error=failed${returnQuery}`, 302);
        }

        const cookie = { httpOnly: true, sameSite: "Lax" as const, secure: isHttps(c), path: "/", maxAge: 60 * 10 };
        setCookie(c, STATE_COOKIE, state, cookie);
        setCookie(c, VERIFIER_COOKIE, verifier, cookie);
        if (returnUrl) {
            setCookie(c, RETURN_URL_COOKIE, returnUrl, cookie);
        }
        return c.redirect(location, 302);
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
        const verifier = getCookie(c, VERIFIER_COOKIE);
        const returnUrl = getCookie(c, RETURN_URL_COOKIE);
        deleteCookie(c, STATE_COOKIE, { path: "/" });
        deleteCookie(c, VERIFIER_COOKIE, { path: "/" });
        deleteCookie(c, RETURN_URL_COOKIE, { path: "/" });

        // Every way back to the login screen keeps where to go, so a retry still ends up there.
        const returnQuery = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : "";

        if (!code || !state || !sent || !verifier || !sameState(sent, state)) {
            return c.redirect(`${LOGIN_PAGE}?error=failed${returnQuery}`, 302);
        }

        try {
            const response = await finishOAuthLogin(provider, { code, redirectUri: callbackUrl(c, provider), codeVerifier: verifier });
            setAuthCookie(c, response.token);
        } catch (e) {
            // The browser only sees "failed", so the cause is logged here; this path never reaches onError.
            console.error(`[auth/oauth] ${provider} login failed`, e);
            const reason = e instanceof ServerError && e.status === 403 ? "disabled" : "failed";
            return c.redirect(`${LOGIN_PAGE}?error=${reason}${returnQuery}`, 302);
        }
        return c.redirect(`${LOGIN_PAGE}?session=1${returnQuery}`, 302);
    });
