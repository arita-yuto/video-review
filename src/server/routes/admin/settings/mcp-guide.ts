import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { getGuideNotes, saveGuideNotes } from "@/server/lib/mcp/server";

const NotesSchema = z.object({ notes: z.string().max(20_000) });

// The team notes appended to the built-in MCP search guide.
export const mcpGuideRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "the MCP search guide notes",
        path: "/",
        responses: {
            200: { description: "The saved notes", content: { "application/json": { schema: NotesSchema } } },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        return c.json({ notes: (await getGuideNotes()) ?? "" }, 200);
    })
    .openapi(createRoute({
        method: "put",
        summary: "save the MCP search guide notes",
        path: "/",
        request: { body: { content: { "application/json": { schema: NotesSchema } } } },
        responses: {
            200: { description: "The saved notes", content: { "application/json": { schema: NotesSchema } } },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        await saveGuideNotes(c.req.valid("json").notes);

        return c.json({ notes: (await getGuideNotes()) ?? "" }, 200);
    });
