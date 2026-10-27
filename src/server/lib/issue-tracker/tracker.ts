import { z } from "@hono/zod-openapi";

// What the comment routes need from an issue tracker.

// Workflow statuses are mapped to these three so the chip can show an icon without knowing status names.
export const ISSUE_STATUS_CATEGORIES = ["new", "indeterminate", "done"] as const;
export type IssueStatusCategory = typeof ISSUE_STATUS_CATEGORIES[number];

export const IssueStatusSchema = z.object({ name: z.string(), category: z.enum(ISSUE_STATUS_CATEGORIES) });
export type IssueStatus = z.infer<typeof IssueStatusSchema>;

export const IssueSchema = z.object({ key: z.string(), summary: z.string(), status: IssueStatusSchema });
export type Issue = z.infer<typeof IssueSchema>;

export type IssueTransition = { id: string; name: string };

// What a comment gives the tracker; each tracker lays it out within its own field limits.
export type IssueSource = {
    comment: string;
    videoTitle: string;
    time: number;
    author: string;
    link: string | null;
};

export type CreateIssueInput = {
    source: IssueSource;
    issueType: string;
    reporterEmail?: string;
    attachment?: File | null;
};

export interface IssueTracker {
    // Returns the new issue's key.
    createIssue(input: CreateIssueInput): Promise<string>;
    // null when the tracker says there is no such issue; throws when the tracker cannot be reached.
    getIssue(key: string): Promise<Issue | null>;
    listTransitions(key: string): Promise<IssueTransition[]>;
    transition(key: string, transitionId: string): Promise<void>;
    issueUrl(key: string): string;
    // The names behind the comment menu's Task and Bug items; null hides the item.
    issueTypes(): Promise<{ task: string | null; bug: string | null }>;
}
