import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { describeJiraConfig, getJiraConfig, resetJiraConfig, updateJiraConfig } from "@/server/lib/settings/jira";

const SourceSchema = z.enum(["saved", "env"]).nullable();

const PlainValueSchema = z.object({
    value: z.string().nullable(),
    source: SourceSchema,
});

const JiraSettingsSchema = z.object({
    baseUrl: PlainValueSchema,
    project: PlainValueSchema,
    assignee: PlainValueSchema,
    token: z.object({ configured: z.boolean(), source: SourceSchema }),
});

// The base URL is joined with "/rest/..." by every Jira call, so a trailing slash would double up.
const BaseUrlSchema = z.string().url()
    .refine(url => /^https?:\/\//.test(url), "must be an http or https URL")
    .transform(url => url.replace(/\/+$/, ""));

const JiraUpdateSchema = z.object({
    baseUrl: BaseUrlSchema.optional().openapi({ description: "Required together with token" }),
    token: z.string().min(1).optional(),
    project: z.string().min(1).optional(),
    assignee: z.string().min(1).optional(),
}).refine(body => body.baseUrl === undefined || body.token !== undefined, {
    message: "enter the token again when changing the url",
    path: ["token"],
});

const ProjectListSchema = z.array(z.object({ key: z.string(), name: z.string() }));

const JiraTestResultSchema = z.object({
    ok: z.boolean(),
    projects: ProjectListSchema,
    error: z.string().optional(),
});

export const settingsRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "jira settings",
        path: "/jira",
        responses: {
            200: {
                description: "Jira settings, without the token itself",
                content: { "application/json": { schema: JiraSettingsSchema } },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("A saved secret could not be read"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        return c.json(await describeJiraConfig(), 200);
    })
    .openapi(createRoute({
        method: "put",
        summary: "update jira settings",
        path: "/jira",
        request: {
            body: { content: { "application/json": { schema: JiraUpdateSchema } } },
        },
        responses: {
            200: {
                description: "Jira settings after the update, without the token itself",
                content: { "application/json": { schema: JiraSettingsSchema } },
            },
            400: errorResponse("Invalid parameters"),
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("A saved secret could not be read"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        await updateJiraConfig(c.req.valid("json"));

        return c.json(await describeJiraConfig(), 200);
    })
    .openapi(createRoute({
        method: "delete",
        summary: "reset jira settings",
        path: "/jira",
        responses: {
            200: {
                description: "Jira settings after every saved value was dropped",
                content: { "application/json": { schema: JiraSettingsSchema } },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("A saved secret could not be read"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        await resetJiraConfig();

        return c.json(await describeJiraConfig(), 200);
    })
    .openapi(createRoute({
        method: "post",
        summary: "test the saved jira connection",
        path: "/jira/test",
        responses: {
            200: {
                description: "Whether Jira accepted the values, and its projects when it did",
                content: { "application/json": { schema: JiraTestResultSchema } },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            500: errorResponse("A saved secret could not be read"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        // Only the saved URL and token are used: taking a URL from the request would let a caller
        // have the saved token sent to an address of their choosing.
        const { baseUrl, token } = await getJiraConfig();
        if (!baseUrl || !token) {
            return c.json({ ok: false, projects: [], error: "the url and token are not both set" }, 200);
        }

        let res: Response;
        try {
            res = await fetch(`${baseUrl}/rest/api/2/project`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                signal: AbortSignal.timeout(10_000),
            });
        } catch {
            return c.json({ ok: false, projects: [], error: "jira could not be reached" }, 200);
        }

        if (!res.ok) {
            return c.json({ ok: false, projects: [], error: `jira answered ${res.status}` }, 200);
        }

        try {
            return c.json({ ok: true, projects: ProjectListSchema.parse(await res.json()) }, 200);
        } catch {
            // Often a login or proxy page, which means the URL does not point at Jira's API.
            return c.json({ ok: false, projects: [], error: "jira sent an unexpected response" }, 200);
        }
    });
