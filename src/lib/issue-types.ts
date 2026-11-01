import { z } from "zod";

// The issue shape the comment routes return and the comment panel shows.

// Workflow statuses are mapped to these three so the chip can show an icon without knowing status names.
export const ISSUE_STATUS_CATEGORIES = ["new", "indeterminate", "done"] as const;
export type IssueStatusCategory = typeof ISSUE_STATUS_CATEGORIES[number];

export const IssueStatusSchema = z.object({ name: z.string(), category: z.enum(ISSUE_STATUS_CATEGORIES) });
export type IssueStatus = z.infer<typeof IssueStatusSchema>;

export const IssueSchema = z.object({ key: z.string(), summary: z.string(), status: IssueStatusSchema });
export type Issue = z.infer<typeof IssueSchema>;
