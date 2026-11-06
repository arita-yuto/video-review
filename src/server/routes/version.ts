import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { env } from "@/server/lib/env";

// No authorize: a bug report needs the version before login.
export const versionRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get the running version",
        path: "/",
        responses: {
            200: {
                description: "The release tag this build was made from, or dev",
                content: { "application/json": { schema: z.object({ version: z.string() }) } },
            },
        },
    }), async (c) => {
        return c.json({ version: env.BUILD_VERSION }, 200);
    });
