import { beforeEach, describe, expect, it, vi } from "vitest";

// Which VideoReview user a Jira account lands on is decided by what is already in the DB, so the DB is a mock.
const prismaMock = vi.hoisted(() => ({
    identity: {
        findUnique: vi.fn(),
        upsert: vi.fn(async () => ({})),
    },
    user: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
    },
}));

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", () => ({ signToken: vi.fn(async () => "token") }));
vi.mock("@/server/lib/integrations/jira", () => ({ getJiraConfig: vi.fn() }));

import { loginJiraUser } from "@/server/lib/login/jira/jira-user";

const JIRA_USER = { key: "JIRAUSER100", emailAddress: "new@example.com", displayName: "Hitori" };
const USER = { id: "user-1", email: "old@example.com", displayName: "Hitori", role: "admin", active: true };

describe("loginJiraUser", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prismaMock.identity.findUnique.mockResolvedValue(null);
        prismaMock.user.findUnique.mockResolvedValue(null);
        prismaMock.user.update.mockImplementation(async ({ data }: { data: object }) => ({ ...USER, ...data }));
        prismaMock.user.create.mockImplementation(async ({ data }: { data: object }) => ({ ...USER, id: "user-new", ...data }));
    });

    it("keeps the user whose identity has the Jira key, even with a new email", async () => {
        prismaMock.identity.findUnique.mockResolvedValue({ user: USER });

        const res = await loginJiraUser(JIRA_USER);

        expect(res).toMatchObject({ id: "user-1", role: "admin", provider: "jira" });
        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("links the Jira key to the user with the same email the first time", async () => {
        prismaMock.user.findUnique.mockResolvedValue(USER);

        const res = await loginJiraUser(JIRA_USER);

        expect(res.id).toBe("user-1");
        expect(prismaMock.identity.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: { userId: "user-1", provider: "jira", providerUid: "JIRAUSER100" },
        }));
        expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("refuses a disabled user with 403 before touching anything", async () => {
        prismaMock.identity.findUnique.mockResolvedValue({ user: { ...USER, active: false } });

        await expect(loginJiraUser(JIRA_USER)).rejects.toMatchObject({ status: 403 });
        expect(prismaMock.user.update).not.toHaveBeenCalled();
        expect(prismaMock.identity.upsert).not.toHaveBeenCalled();
    });
});
