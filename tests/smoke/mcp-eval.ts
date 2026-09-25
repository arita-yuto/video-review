import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { EVAL_FOLDER_PREFIX } from "../../prisma/eval-data";

// Checks that the MCP tools return the intended results for the eval dataset
// (npm run prisma:seed:eval). Each case is the tool call an assistant is expected to make
// for the question, plus the exact set of values that must come back.
//
// Usage (against a running app, with VIDEO_REVIEW_API_TOKEN in .env):
//   npm run mcp:eval
//   MCP_EVAL_URL=http://videoreview.internal:3489/api/v1/mcp npm run mcp:eval

type ToolArgs = Record<string, unknown>;
type Json = Record<string, unknown>;

type EvalContext = {
    /** Eval video id -> title, so results keyed by videoId can be reported by title. */
    titleById: Map<string, string>;
    /** Eval video title -> id, for tools that need a concrete id argument. */
    idByTitle: Map<string, string>;
};

type EvalCase = {
    question: string;
    tool: string;
    args: ToolArgs | ((ctx: EvalContext) => ToolArgs);
    /** Values that must be returned, and nothing else from the eval set. */
    expect: string[];
    /** Turns the tool result into the values to compare; defaults to eval video titles. */
    extract?: (result: unknown, ctx: EvalContext) => string[];
};

function isoDaysAgo(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

const TODAY = isoDaysAgo(0);

const videoTitles = (result: unknown, ctx: EvalContext): string[] => {
    const items = Array.isArray(result) ? result : (result as { videos?: unknown[] })?.videos ?? [];
    const evalTitles = new Set(ctx.titleById.values());
    // Videos outside the eval set may match too when the tool has no folder filter; only judge eval titles.
    return unique(items.map(i => (i as Json).title).filter((t): t is string => typeof t === "string" && evalTitles.has(t)));
};

const commentVideoTitles = (result: unknown, ctx: EvalContext): string[] =>
    unique((result as { videoId: string }[]).map(c => ctx.titleById.get(c.videoId)).filter((t): t is string => t !== undefined));

const pullRequestTitles = (result: unknown): string[] =>
    unique(((result as { pullRequests: { title: string }[] }).pullRequests).map(pr => pr.title));

const relevantChangeAuthors = (result: unknown): string[] => {
    const r = result as { pullRequests: { author: string; relevance: string }[]; commits: { author: string; relevance: string }[] };
    return unique([...r.pullRequests, ...r.commits].filter(x => x.relevance === "high").map(x => x.author));
};

function unique(values: string[]): string[] {
    return [...new Set(values)];
}

const absoluteUrls = (result: unknown): string[] => {
    const items = result as { url?: string }[];
    return items.every(i => typeof i.url === "string" && /^https?:\/\//.test(i.url)) ? ["all absolute"] : ["missing or relative url"];
};

const CASES: EvalCase[] = [
    {
        question: "Do tool results carry links that work outside the app?",
        tool: "list_videos",
        args: { name: EVAL_FOLDER_PREFIX },
        expect: ["all absolute"],
        extract: absoluteUrls,
    },
    {
        question: "Which videos were uploaded in the last 7 days?",
        tool: "list_videos",
        args: { videoFrom: isoDaysAgo(7), videoTo: TODAY, name: EVAL_FOLDER_PREFIX },
        expect: ["Boss Fight - Dragon Phase 2", "UI - Inventory Screen", "Shader - Water Reflection Test", "Performance - Crowd Scene Stress"],
    },
    {
        question: "Show me the boss fight videos (tag 'boss').",
        tool: "list_videos",
        args: { tags: "boss", name: EVAL_FOLDER_PREFIX },
        expect: ["Boss Fight - Dragon Phase 2", "Boss Fight - Golem Phase 1"],
    },
    {
        question: "Which videos have comments linked to an issue ticket?",
        tool: "list_videos",
        args: { hasIssue: true, name: EVAL_FOLDER_PREFIX },
        expect: ["Boss Fight - Dragon Phase 2", "UI - Inventory Screen", "Enemy AI - Patrol Behaviour", "Localization - Japanese Menu Check"],
    },
    {
        question: "Which videos have a comment with a drawing?",
        tool: "list_videos",
        args: { hasDrawing: true, name: EVAL_FOLDER_PREFIX },
        expect: ["Boss Fight - Dragon Phase 2", "Boss Fight - Golem Phase 1"],
    },
    {
        question: "Which videos did Kita comment on?",
        tool: "list_videos",
        args: { commentUser: "Kita", name: EVAL_FOLDER_PREFIX },
        expect: ["Boss Fight - Dragon Phase 2", "UI - Inventory Screen", "Localization - Japanese Menu Check"],
    },
    {
        question: "Find the video where someone wrote about clipping.",
        tool: "list_comments",
        args: { filterText: "clips" },
        expect: ["Boss Fight - Dragon Phase 2"],
        extract: commentVideoTitles,
    },
    {
        question: "Which video mentions 'kingdom' in its dialogue?",
        tool: "search_videos_by_event",
        args: { filterText: "kingdom", kind: "transcription" },
        expect: ["Cutscene - Opening"],
    },
    {
        question: "Which videos contain the on-screen text 'PRESS A'?",
        tool: "search_videos_by_event",
        args: { filterText: "press a" },
        expect: ["Tutorial - Movement Basics"],
    },
    {
        question: "Which UI videos have a 'bug' tag?",
        tool: "list_videos",
        args: { name: `${EVAL_FOLDER_PREFIX}ui`, tags: "bug" },
        expect: ["UI - Inventory Screen"],
    },
    {
        question: "What is the most recently uploaded eval video?",
        tool: "list_videos",
        args: { name: EVAL_FOLDER_PREFIX, sortBy: "uploadedAt_desc", limit: 1 },
        expect: ["Performance - Crowd Scene Stress"],
    },
    {
        question: "Which pull requests went into the latest dragon boss revision?",
        tool: "list_vcs_changes",
        args: (ctx) => ({ videoId: ctx.idByTitle.get("Boss Fight - Dragon Phase 2") }),
        expect: ["Fix dragon tail collision"],
        extract: pullRequestTitles,
    },
    {
        question: "Who made the relevant code changes behind the crowd stress video?",
        tool: "list_vcs_changes",
        args: (ctx) => ({ videoId: ctx.idByTitle.get("Performance - Crowd Scene Stress") }),
        // The README-only PR is scored "unlikely" against the watched paths and must not count.
        expect: ["ryo"],
        extract: relevantChangeAuthors,
    },
];

async function connect(): Promise<Client> {
    const client = new Client({ name: "video-review-eval", version: "1.0.0" });
    const url = new URL(process.env.MCP_EVAL_URL ?? "http://localhost:3489/api/v1/mcp");
    const headers = { "x-api-token": process.env.VIDEO_REVIEW_API_TOKEN ?? "" };
    await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers } }));
    return client;
}

async function callTool(client: Client, name: string, args: ToolArgs): Promise<unknown> {
    const res = await client.callTool({ name, arguments: args });
    const content = res.content as { type: string; text?: string }[];
    const text = content.filter(c => c.type === "text").map(c => c.text ?? "").join("");
    if (res.isError) throw new Error(text);
    return JSON.parse(text);
}

async function loadContext(client: Client): Promise<EvalContext> {
    const videos = await callTool(client, "list_videos", { name: EVAL_FOLDER_PREFIX }) as { id: string; title: string }[];
    return {
        titleById: new Map(videos.map(v => [v.id, v.title])),
        idByTitle: new Map(videos.map(v => [v.title, v.id])),
    };
}

function sameSet(a: string[], b: string[]): boolean {
    const x = [...a].sort();
    const y = [...b].sort();
    return x.length === y.length && x.every((v, i) => v === y[i]);
}

async function main() {
    const client = await connect();
    const ctx = await loadContext(client);
    if (ctx.titleById.size === 0) {
        console.error(`No videos under "${EVAL_FOLDER_PREFIX}". Run: npm run prisma:seed:eval`);
        process.exitCode = 1;
        await client.close();
        return;
    }

    let failed = 0;
    for (const c of CASES) {
        const args = typeof c.args === "function" ? c.args(ctx) : c.args;
        let actual: string[];
        try {
            const result = await callTool(client, c.tool, args);
            actual = (c.extract ?? videoTitles)(result, ctx);
        } catch (err) {
            failed++;
            console.log(`FAIL  ${c.question}\n      ${c.tool} threw: ${String(err)}`);
            continue;
        }
        const ok = sameSet(actual, c.expect);
        if (!ok) failed++;
        console.log(`${ok ? "PASS" : "FAIL"}  ${c.question}`);
        if (!ok) {
            console.log(`      expected: ${[...c.expect].sort().join(" | ")}`);
            console.log(`      actual:   ${[...actual].sort().join(" | ") || "(none)"}`);
        }
    }

    await client.close();
    console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
    process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
