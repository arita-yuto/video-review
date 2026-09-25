import { OpenAPIHono as Hono } from "@hono/zod-openapi";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authorize } from "@/server/lib/token";
import { createMcpServer } from "@/server/lib/mcp/server";

// The MCP endpoint AI agents connect to. It speaks the MCP protocol rather than a REST shape,
// so it is a plain route and stays out of the OpenAPI document.
export const mcpRouter = new Hono().all("/", async (c) => {
    await authorize(c.req.raw, ["viewer", "admin"]);

    // Stateless: a fresh server per request, answered as plain JSON so nothing stays open.
    const server = await createMcpServer(c.req.raw);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    try {
        return await transport.handleRequest(c.req.raw);
    } finally {
        await server.close();
    }
});
