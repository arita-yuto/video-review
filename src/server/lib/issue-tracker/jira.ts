import { getJiraConfig } from "@/server/lib/settings/jira";
import { ServerError } from "@/server/lib/server-error";

import "server-only";

export type CreateIssueInput = {
    summary: string;
    description: string;
    issueType: string;
    reporterEmail?: string;
    attachment?: File | null;
};

// The attachment is uploaded in a second request because the issue API has no multipart form.
export async function createJiraIssue(input: CreateIssueInput): Promise<string> {
    const { baseUrl: base, token, project, assignee: assigneeEmail } = await getJiraConfig();

    if (!base || !token || !project) {
        throw new ServerError("jira configuration is missing", 500);
    }

    const res = await fetch(`${base}/rest/api/2/issue`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify({
            fields: {
                project: { key: project },
                summary: input.summary,
                description: input.description,
                issuetype: { name: input.issueType },
                ...(assigneeEmail && { assignee: { name: assigneeEmail } }),
                ...(input.reporterEmail && { reporter: { name: input.reporterEmail } }),
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
                "Authorization": `Bearer ${token}`,
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
