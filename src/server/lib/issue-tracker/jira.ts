import { getJiraConfig, getJiraIssueTypes, type JiraDeployment, jiraDeployment, jiraAuthorization, searchJiraAccount } from "@/server/lib/integrations/jira";
import { ISSUE_STATUS_CATEGORIES, type CreateIssueInput, type Issue, type IssueSource, type IssueTracker, type IssueTransition } from "@/server/lib/issue-tracker/tracker";
import { ServerError } from "@/server/lib/server-error";
import { z } from "@hono/zod-openapi";
import { formatTime } from "@/lib/utils";

import "server-only";

type JiraConnection = {
    base: string;
    authorization: string;
    deployment: JiraDeployment;
    project: string;
    assigneeEmail?: string;
};

export async function jiraTracker(): Promise<IssueTracker | null> {
    const { deployment: saved, baseUrl: base, email, token, project, assignee: assigneeEmail } = await getJiraConfig();
    if (!base || !token || !project) {
        return null;
    }

    const deployment = jiraDeployment(saved);
    const connection: JiraConnection = { base, authorization: jiraAuthorization(deployment, email, token), deployment, project, assigneeEmail };

    return {
        createIssue: (input) => createIssue(connection, input),
        getIssue: (key) => getIssue(connection, key),
        listTransitions: (key) => listTransitions(connection, key),
        transition: (key, transitionId) => transition(connection, key, transitionId),
        issueUrl: (key) => `${base}/browse/${key}`,
        issueTypes: getJiraIssueTypes,
    };
}

function jsonHeaders(authorization: string) {
    return { "Authorization": authorization, "Content-Type": "application/json", "Accept": "application/json" };
}

// The attachment is uploaded in a second request because the issue API has no multipart form.
async function createIssue({ base, authorization, deployment, project, assigneeEmail }: JiraConnection, input: CreateIssueInput): Promise<string> {
    const assignee = assigneeEmail ? await userRef(base, authorization, deployment, assigneeEmail) : undefined;
    const reporter = input.reporterEmail ? await userRef(base, authorization, deployment, input.reporterEmail) : undefined;

    const res = await fetch(`${base}/rest/api/2/issue`, {
        method: "POST",
        headers: jsonHeaders(authorization),
        body: JSON.stringify({
            fields: {
                project: { key: project },
                ...issueText(input.source),
                issuetype: { name: input.issueType },
                ...(assignee && { assignee }),
                ...(reporter && { reporter }),
            },
        }),
    });

    if (!res.ok) {
        throw new ServerError("failed to create jira issue", 500);
    }

    const issueKey: string = (await res.json()).key;

    if (input.attachment) {
        const form = new FormData();
        form.append("file", input.attachment, input.attachment.name);

        const uploadRes = await fetch(`${base}/rest/api/2/issue/${issueKey}/attachments`, {
            method: "POST",
            headers: {
                "Authorization": authorization,
                "X-Atlassian-Token": "no-check",
            },
            body: form,
        });

        if (!uploadRes.ok) {
            throw new ServerError("failed to attach file to jira issue", 500);
        }
    }

    return issueKey;
}

// Data Center names a person by username; Cloud only takes an accountId, found by searching the email.
async function userRef(base: string, authorization: string, deployment: JiraDeployment, email: string): Promise<object | undefined> {
    if (deployment === "data-center") {
        return { name: email };
    }

    const account = await searchJiraAccount(deployment, base, authorization, email).catch(() => undefined);
    return account?.accountId ? { accountId: account.accountId } : undefined;
}

// Jira's summary is one line of at most 255 characters, so the comment's first line goes there and the whole text in the description.
export function issueText(source: IssueSource): { summary: string; description: string } {
    const firstLine = source.comment.split(/\r?\n/).map(line => line.trim()).find(line => line !== "") ?? "";
    const summary = cutSummary(firstLine);

    const description = [
        source.comment,
        "",
        `Video: ${source.videoTitle} (${formatTime(source.time)})`,
        `Author: ${source.author}`,
        source.link ?? "",
    ].join("\n");

    return { summary, description };
}

// Jira counts UTF-16 units, so the budget is line.length; the cut only steps back off a split emoji.
function cutSummary(line: string): string {
    const SUMMARY_MAX_LENGTH = 255;
    if (line.length <= SUMMARY_MAX_LENGTH) {
        return line;
    }

    let cut = line.slice(0, SUMMARY_MAX_LENGTH - 1);
    if (/[\uD800-\uDBFF]$/.test(cut)) {
        cut = cut.slice(0, -1);
    }

    return `${cut}…`;
}

const JiraIssueSchema = z.object({
    key: z.string(),
    fields: z.object({
        summary: z.string(),
        status: z.object({
            name: z.string(),
            statusCategory: z.object({ key: z.enum(ISSUE_STATUS_CATEGORIES).catch("new") }),
        }),
    }),
});

// Comment chips ask for the same issues on every refresh, so a found issue is kept for a minute.
const issueCache = new Map<string, { issue: Issue; expires: number }>();

async function getIssue({ base, authorization }: JiraConnection, key: string): Promise<Issue | null> {
    const ISSUE_CACHE_MS = 60_000;
    const cached = issueCache.get(key);
    if (cached && cached.expires > Date.now()) {
        return cached.issue;
    }

    const res = await fetch(`${base}/rest/api/2/issue/${encodeURIComponent(key)}?fields=summary,status`, {
        headers: { "Authorization": authorization, "Accept": "application/json" },
    });
    if (res.status === 404) {
        return null;
    }
    if (!res.ok) {
        throw new ServerError(`failed to read jira issue ${key}: ${res.status}`, 500);
    }

    const parsed = JiraIssueSchema.safeParse(await res.json());
    if (!parsed.success) {
        throw new ServerError(`jira sent an unexpected issue ${key}`, 500);
    }

    const { status } = parsed.data.fields;
    const issue: Issue = { key: parsed.data.key, summary: parsed.data.fields.summary, status: { name: status.name, category: status.statusCategory.key } };
    issueCache.set(key, { issue, expires: Date.now() + ISSUE_CACHE_MS });
    return issue;
}

const TransitionsSchema = z.object({ transitions: z.array(z.object({ id: z.string(), to: z.object({ name: z.string() }) })) });

// Named by the status it leads to; transition names keep the language the workflow was made in, status names follow the account's.
async function listTransitions({ base, authorization }: JiraConnection, key: string): Promise<IssueTransition[]> {
    const res = await fetch(`${base}/rest/api/2/issue/${encodeURIComponent(key)}/transitions`, {
        headers: { "Authorization": authorization, "Accept": "application/json" },
    });
    if (!res.ok) {
        throw new ServerError(`failed to list jira transitions of ${key}: ${res.status}`, 500);
    }

    const parsed = TransitionsSchema.safeParse(await res.json());
    if (!parsed.success) {
        throw new ServerError(`jira sent unexpected transitions for ${key}`, 500);
    }

    return parsed.data.transitions.map(({ id, to }) => ({ id, name: to.name }));
}

// Jira's refusal, such as a required field on the transition screen, is passed on as a 400 so its message reaches the user.
async function transition({ base, authorization }: JiraConnection, key: string, transitionId: string): Promise<void> {
    const res = await fetch(`${base}/rest/api/2/issue/${encodeURIComponent(key)}/transitions`, {
        method: "POST",
        headers: jsonHeaders(authorization),
        body: JSON.stringify({ transition: { id: transitionId } }),
    });
    if (res.status >= 400 && res.status < 500) {
        throw new ServerError(await jiraErrorMessage(res) ?? `jira refused to move ${key}`, 400);
    }
    if (!res.ok) {
        throw new ServerError(`failed to move jira issue ${key}: ${res.status}`, 500);
    }

    issueCache.delete(key);
}

const ErrorBodySchema = z.object({ errorMessages: z.array(z.string()).optional(), errors: z.record(z.string(), z.string()).optional() });

async function jiraErrorMessage(res: Response): Promise<string | null> {
    const parsed = ErrorBodySchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) {
        return null;
    }
    const messages = [...(parsed.data.errorMessages ?? []), ...Object.values(parsed.data.errors ?? {})];
    return messages.length > 0 ? messages.join(" ") : null;
}
