import "server-only";
import { jiraTracker } from "@/server/lib/issue-tracker/jira";
import type { IssueTracker } from "@/server/lib/issue-tracker/tracker";

export async function issueTracker(): Promise<IssueTracker | null> {
    return jiraTracker();
}
