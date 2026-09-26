import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { getResolutionPresets, getUrlSchema } from "@/server/lib/integrations/general";

const errors = {
    401: errorResponse("Unauthorized"),
};

// The General settings a logged-in user's screens need, one value per route with a fixed
// schema, so adding a field to General never widens what these return.
export const configRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "the URL scheme that opens a scene in the editor",
        path: "/url-schema",
        responses: {
            200: {
                description: "The scheme template, or null when the links are off",
                content: { "application/json": { schema: z.object({ urlSchema: z.string().nullable() }) } },
            },
            ...errors,
        },
    }), async (c) => {
        await authorize(c.req.raw, ["guest", "viewer", "admin"]);

        return c.json({ urlSchema: (await getUrlSchema()) ?? null }, 200);
    })
    .openapi(createRoute({
        method: "get",
        summary: "the widths of the downscaled variants",
        path: "/resolution-presets",
        responses: {
            200: {
                description: "The preset widths in pixels",
                content: { "application/json": { schema: z.object({ presets: z.array(z.number()) }) } },
            },
            ...errors,
        },
    }), async (c) => {
        await authorize(c.req.raw, ["guest", "viewer", "admin"]);

        return c.json({ presets: await getResolutionPresets() }, 200);
    });
