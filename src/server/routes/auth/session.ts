import { createRoute, z } from "@hono/zod-openapi";
import { getCookie } from "hono/cookie";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { AUTH_COOKIE, verifyToken } from "@/server/lib/token";
import { prisma } from "@/server/lib/db";
import { ServerError } from "@/server/lib/server-error";
import { ROLES } from "@/lib/role";

const ClaimsSchema = z.object({
    id: z.string(),
    displayName: z.string(),
    role: z.enum(ROLES),
    provider: z.enum(["guest", "jira", "password"]),
});

// After a sign-in that ends in a redirect the browser only holds the cookie, while the app keeps its
// token in memory; this hands the cookie's session over in the same shape as a login response.
export const sessionRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "the session behind the auth cookie",
        path: "/",
        responses: {
            200: {
                description: "The same fields a login returns",
                content: {
                    "application/json": {
                        schema: ClaimsSchema.extend({ token: z.string(), email: z.string().nullable() }),
                    },
                },
            },
            401: errorResponse("No valid session cookie"),
        },
    }), async (c) => {
        const token = getCookie(c, AUTH_COOKIE);
        if (!token) {
            throw new ServerError("not logged in", 401);
        }

        let claims: z.infer<typeof ClaimsSchema>;
        try {
            claims = ClaimsSchema.parse(await verifyToken(token));
        } catch (e) {
            // A missing signing secret is the server's fault; a bad or expired token is a 401.
            if (e instanceof ServerError) {
                throw e;
            }
            throw new ServerError("not logged in", 401);
        }

        const user = await prisma.user.findUnique({ where: { id: claims.id }, select: { email: true } });
        return c.json({ ...claims, token, email: user?.email ?? null }, 200);
    });
