import { createRoute } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { z } from "zod";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { createLLMClient, ChatTurn } from "@/server/lib/integration-clients/llm-client";
import { env } from "@/server/lib/env";

// Bounds keep a single request from pushing arbitrary amounts of text into a paid LLM call.
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_TURNS = 40;

const BodySchema = z.object({
    message: z.string().min(1).max(MAX_MESSAGE_LENGTH),
    history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(MAX_MESSAGE_LENGTH),
    })).max(MAX_HISTORY_TURNS).default([]),
});

async function createMcpClient(url: string): Promise<McpClient> {
    const client = new McpClient({ name: "video-review-chat", version: "1.0.0" });
    try {
        await client.connect(new StreamableHTTPClientTransport(new URL(url)));
    } catch (err) {
        console.error("[chat/search] MCP connect failed:", err);
        throw new ServerError("MCP server is not reachable", 503);
    }
    return client;
}

// Fallback when the MCP server predates the bundled guide and sends no instructions.
const DEFAULT_GUIDE = [
    "You are an assistant for Video Review. Help the user find videos, comments, and events using the available tools.",
    "When filtering by date range, always specify both ends of the range.",
    "When listing videos, link each one as [title](url) using the url field from the tool result.",
].join("\n");

async function readTextTool(mcpClient: McpClient, name: string): Promise<string[]> {
    try {
        const res = await mcpClient.callTool({ name, arguments: {} });
        const text = (res.content as { type: string; text?: string }[]).map(c => c.text ?? "").join("");
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
        return [];
    }
}

// The guide comes from the MCP server so all clients share it; the live tag and folder
// vocabulary is added per request so the model maps the user's wording to real values.
async function buildSystemPrompt(mcpClient: McpClient): Promise<string> {
    const guide = mcpClient.getInstructions() ?? DEFAULT_GUIDE;
    const [tags, folders] = await Promise.all([readTextTool(mcpClient, "list_tags"), readTextTool(mcpClient, "list_folders")]);
    const today = new Date().toISOString().slice(0, 10);
    const context = [
        `Today's date: ${today}`,
        "Always respond in the same language as the user's message.",
    ];
    if (tags.length > 0) context.push(`Existing tags: ${tags.join(", ")}`);
    if (folders.length > 0) context.push(`Existing folders: ${folders.join(", ")}`);
    return `${guide.trim()}\n\n# Context\n${context.join("\n")}`;
}

export const chatSearchRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Chat search",
        description: "Search and analyze videos using natural language.",
        path: "/",
        request: {
            body: {
                content: { "application/json": { schema: BodySchema } },
            },
        },
        responses: {
            200: {
                description: "Chat reply",
                content: {
                    "application/json": {
                        schema: z.object({ reply: z.string() }),
                    },
                },
            },
            400: errorResponse("Bad request"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("Internal error"),
            502: errorResponse("LLM request failed"),
            503: errorResponse("LLM or MCP not configured or MCP unreachable"),
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

        const llm = await createLLMClient();
        if (!llm) {
            return c.json({ error: "LLM is not configured" }, 503);
        }
        if (!env.MCP_URL) {
            return c.json({ error: "MCP is not configured" }, 503);
        }

        // Body validation runs before the handler (declared in request.body), so a malformed
        // body is rejected with 400 even before the auth check above.
        const { message, history } = c.req.valid("json");

        const messages: ChatTurn[] = [
            ...history as ChatTurn[],
            { role: "user", content: message },
        ];

        let mcpClient: McpClient | null = null;
        try {
            mcpClient = await createMcpClient(env.MCP_URL);
            const system = await buildSystemPrompt(mcpClient);
            const reply = await llm.completeWithMCP(messages, mcpClient, system);
            return c.json({ reply }, 200);
        } catch (err) {
            if (err instanceof ServerError) {
                return c.json({ error: err.message }, err.status as 400 | 500 | 502 | 503);
            }
            const msg = String(err);
            if (msg.includes("max turns exceeded")) {
                return c.json({ reply: "The query required too many steps to process. Try narrowing it down." }, 200);
            }
            console.error("[chat/search]", err);
            return c.json({ error: "LLM request failed" }, 502);
        } finally {
            await mcpClient?.close?.();
        }
    });
