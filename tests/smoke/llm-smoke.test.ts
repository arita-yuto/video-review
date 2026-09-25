import { describe, expect, it } from "vitest";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { buildLLMClient } from "@/server/lib/integration-clients/llm-client";
import { env } from "@/server/lib/env";

// Talks to the real LLM provider and to the MCP endpoint of a running app (MCP_SMOKE_URL, default the dev server).
// Opt in with LLM_SMOKE=1 (see `npm run llm:check`); `npm test` skips it.
const enabled = process.env.LLM_SMOKE === "1";

describe.skipIf(!enabled)(`LLM smoke check (${env.LLM_PROVIDER ?? "no provider"})`, () => {
    it("answers a plain completion", async () => {
        const client = buildLLMClient({ provider: env.LLM_PROVIDER, apiKey: env.LLM_API_KEY, baseUrl: env.LLM_BASE_URL, model: env.LLM_MODEL });
        expect(client, "VIDEO_REVIEW_LLM_PROVIDER must be set").not.toBeNull();

        const reply = await client!.complete("Reply with the single word OK.");
        console.log(`[llm:check] complete(): ${JSON.stringify(reply)}`);
        expect(reply.trim().length).toBeGreaterThan(0);
    }, 60_000);

    it("calls an MCP tool and answers from its result", async () => {
        const client = buildLLMClient({ provider: env.LLM_PROVIDER, apiKey: env.LLM_API_KEY, baseUrl: env.LLM_BASE_URL, model: env.LLM_MODEL });
        expect(client).not.toBeNull();
        expect(env.VIDEO_REVIEW_API_TOKEN, "VIDEO_REVIEW_API_TOKEN must be set").toBeTruthy();

        const url = new URL(process.env.MCP_SMOKE_URL ?? "http://localhost:3489/api/v1/mcp");
        const mcp = new McpClient({ name: "llm-smoke", version: "1.0.0" });
        await mcp.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { "x-api-token": env.VIDEO_REVIEW_API_TOKEN! } } }));
        try {
            const system = [
                mcp.getInstructions() ?? "",
                "Answer in one short line. Use the list_videos tool with name='eval/' and tags='boss'.",
            ].join("\n");
            const reply = await client!.completeWithMCP(
                [{ role: "user", content: "Which videos in the eval folder are tagged boss? List their titles." }],
                mcp,
                system,
            );
            console.log(`[llm:check] completeWithMCP(): ${JSON.stringify(reply)}`);
            // The eval dataset (npm run prisma:seed:eval) has exactly these two boss videos.
            expect(reply).toMatch(/Dragon/);
            expect(reply).toMatch(/Golem/);
        } finally {
            await mcp.close();
        }
    }, 120_000);
});
