import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { VideoReviewStorage } from "@/server/lib/storage";
import { authorizeStorageKey } from "@/server/lib/videos/guest-access";
import { getResolutionPresets } from "@/server/lib/integrations/general";
import { downscaledVideoKey } from "@/lib/storage-key";

export const sizesRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Get video file sizes",
        description: "Returns the byte sizes of an original video file and of its downscaled files.",
        path: "/:path{.*}",
        responses: {
            200: {
                description: "File sizes in bytes; a preset whose file does not exist is left out",
                content: {
                    "application/json": {
                        schema: z.object({
                            original: z.number().nullable(),
                            downscaled: z.array(z.object({ width: z.number(), size: z.number() })),
                        }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            400: errorResponse("Invalid path"),
        },
    }), async (c) => {
        const key = c.req.param("path");
        await authorizeStorageKey(c.req.raw, ["guest", "viewer", "admin"], key);

        const presets = await getResolutionPresets();
        const [original, ...presetSizes] = await Promise.all([
            VideoReviewStorage.objectSize(key),
            ...presets.map((width) => VideoReviewStorage.objectSize(downscaledVideoKey(key, width))),
        ]);

        const downscaled = presets.flatMap((width, presetIndex) => {
            const size = presetSizes[presetIndex];

            return size === null ? [] : [{ width, size }];
        });

        return c.json({ original, downscaled }, 200);
    });
