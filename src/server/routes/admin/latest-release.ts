import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { env } from "@/server/lib/env";
import { isUpdateCheckEnabled } from "@/server/lib/integrations/general";
import { getLatestRelease, isNewerVersion } from "@/server/lib/latest-release";

export const latestReleaseRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get the release newer than the running one",
        path: "/",
        responses: {
            200: {
                description: "The newer release, or null when the check is off, GitHub cannot be reached, or this build is current",
                content: {
                    "application/json": {
                        schema: z.object({ latest: z.object({ version: z.string(), url: z.string(), notes: z.string() }).nullable() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        if (!(await isUpdateCheckEnabled())) {
            return c.json({ latest: null }, 200);
        }

        const release = await getLatestRelease();
        // The dev server has no release of its own, so it offers the latest one to show the dialog with real notes.
        const offered = env.DEV_SERVER || isNewerVersion(release?.version ?? "", env.BUILD_VERSION);
        const latest = release && offered ? release : null;
        return c.json({ latest }, 200);
    });
