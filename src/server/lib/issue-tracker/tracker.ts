import "server-only";
import type { Issue } from "@/lib/issue-types";

// What the comment routes need from an issue tracker.

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
