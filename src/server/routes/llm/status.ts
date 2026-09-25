import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { createLLMClient } from "@/server/lib/integration-clients/llm-client";
import { getLLMConfig } from "@/server/lib/integrations/llm";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { env } from "@/server/lib/env";

// Each reachability probe opens an MCP session and lists tools, so share the result
// across requests for a short window instead of probing on every page load.
const REACHABILITY_TTL_MS = 30_000;
let reachabilityCache: { reachable: boolean; checkedAt: number } | null = null;

async function isMcpReachable(url: string): Promise<boolean> {
    const now = Date.now();
    if (reachabilityCache && now - reachabilityCache.checkedAt < REACHABILITY_TTL_MS) {
        return reachabilityCache.reachable;
    }
    let reachable = false;
    let mcpClient: McpClient | null = null;
    try {
        mcpClient = new McpClient({ name: "video-review-status", version: "1.0.0" });
        await mcpClient.connect(new StreamableHTTPClientTransport(new URL(url)));
        await mcpClient.listTools();
        reachable = true;
    } catch (err) {
        console.error("[llm/status] MCP reachability check failed:", err);
    } finally {
        await mcpClient?.close?.();
    }
    reachabilityCache = { reachable, checkedAt: now };
    return reachable;
}

export const llmStatusRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "LLM and MCP availability status",
        description: "Returns whether the LLM provider and MCP server are configured and reachable.",
        path: "/",
        responses: {
            200: {
                description: "Status",
                content: {
                    "application/json": {
                        schema: z.object({
                            llm: z.object({ configured: z.boolean(), provider: z.string().nullable(), model: z.string().nullable() }),
                            mcp: z.object({ configured: z.boolean(), reachable: z.boolean() }),
                        }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("Auth configuration is missing"),
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["viewer", "admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403 | 500);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        let llm = { configured: false, provider: null as string | null, model: null as string | null };
        try {
            const config = await getLLMConfig();
            llm = { configured: (await createLLMClient()) !== null, provider: config.provider ?? null, model: config.model ?? null };
        } catch (e) {
            // A broken setting reads as "off" here; the admin screen shows what is wrong.
            console.error("[llm/status] could not build the LLM client", e);
        }

        // The MCP URL stays server-side; the client only needs to know whether search works.
        const mcp = {
            configured: env.MCP_URL !== undefined,
            reachable: env.MCP_URL ? await isMcpReachable(env.MCP_URL) : false,
        };

        return c.json({ llm, mcp }, 200);
    });
