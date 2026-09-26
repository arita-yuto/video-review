import { createRoute, z } from "@hono/zod-openapi";
import { Context } from "hono";
import { setCookie } from "hono/cookie";
import { createRouter } from "@/server/lib/openapi/router";
import { loginUser, loginAsGuest, loginWithJira } from "@/server/lib/login";
import { ServerError } from "@/server/lib/server-error";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { AUTH_COOKIE } from "@/server/lib/token";
import { isGuestAllowed } from "@/server/lib/integrations/general";

// Only mark the cookie Secure over https; dev and E2E run on http, where a Secure
// cookie would never be sent and would break media playback.
function isHttps(c: Context): boolean {
    const proto = c.req.header("x-forwarded-proto") ?? new URL(c.req.url).protocol.replace(":", "");
    return proto === "https";
}

function setAuthCookie(c: Context, token: string) {
    setCookie(c, AUTH_COOKIE, token, {
        httpOnly: true,
        sameSite: "Lax",
        secure: isHttps(c),
        path: "/",
        maxAge: 60 * 60 * 24,
    });
}

const loginUserSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

const loginGuestSchema = z.object({
    displayName: z.string().min(1),
});

const loginJIRASchema = z.object({
    email: z.email(),
});

const LoginResponseSchema = z.object({
    token: z.string(),
    id: z.string(),
    email: z.string().nullable().optional(),
    displayName: z.string(),
    role: z.enum(["guest", "viewer", "admin"]),
    provider: z.enum(["guest", "jira", "password"]),
});

export const loginRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Login as admin",
        description: "Logs in a user as an admin.",
        path: "/password",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: loginUserSchema,
                    },
                },
                required: true,
            },
        },
        responses: {
            200: {
                description: "login successful",
                content: {
                    "application/json": {
                        schema: LoginResponseSchema,
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Login failed"),
        },
    }), async (c) => {
        try{
            const body = c.req.valid("json");
            const response = await loginUser({
                ...body,
                displayName: "",
            });
            setAuthCookie(c, response.token);
            return c.json(response, 200);
        } catch(e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 400 | 401 | 500);
            } else {
                return c.json({ error: "failed to login" }, 500);
            }
        }
    })
    .openapi(createRoute({
        method: "post",
        summary: "Login as guest",
        description: "Logs in a user as a guest.",
        path: "/guest",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: loginGuestSchema,
                    },
                },
                required: true,
            },
        },
        responses: {
            200: {
                description: "login successful",
                content: {
                    "application/json": {
                        schema: LoginResponseSchema,
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Guest login disabled"),
            500: errorResponse("Login failed"),
        },
    }), async (c) => {
        if (!await isGuestAllowed()) {
            return c.json({ error: "guest login is disabled" }, 403);
        }
        try{
            const body = c.req.valid("json");
            const response = await loginAsGuest({
                ...body,
                email: "",
                password: "",
            });
            setAuthCookie(c, response.token);
            return c.json(response, 200);
        } catch(e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 400 | 401 | 500);
            } else {
                return c.json({ error: "failed to login" }, 500);
            }
        }
    })
    .openapi(createRoute({
        method: "post",
        summary: "Login with Jira",
        description: "Logs in a user with Jira credentials.",
        path: "/jira",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: loginJIRASchema,
                    },
                },
                required: true,
            },
        },
        responses: {
            200: {
                description: "login successful",
                content: {
                    "application/json": {
                        schema: LoginResponseSchema,
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            500: errorResponse("Login failed"),
        },
    }), async (c) => {
        try{
            const body = c.req.valid("json");
            const response = await loginWithJira({
                ...body,
                displayName: "",
                password: "",
            });
            setAuthCookie(c, response.token);
            return c.json(response, 200);
        } catch(e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 400 | 401 | 500);
            } else {
                return c.json({ error: "failed to login" }, 500);
            }
        }
    });
