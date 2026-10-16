import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
const getJiraBaseUrlMock = vi.hoisted(() => vi.fn());
vi.mock("@/server/lib/integrations/jira", () => ({ getJiraBaseUrl: getJiraBaseUrlMock }));

import { loginJiraUser, loginWithJira } from "@/server/lib/login/jira/jira-user";

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

describe("loginWithJira", () => {
    const fetchMock = vi.fn();

    const myself = (status: number, body?: object) =>
        ({ ok: status === 200, status, headers: new Headers(), json: async () => body }) as unknown as Response;

    beforeEach(() => {
        vi.clearAllMocks();
        getJiraBaseUrlMock.mockResolvedValue("https://jira.example.com");
        prismaMock.identity.findUnique.mockResolvedValue({ user: USER });
        prismaMock.user.update.mockResolvedValue(USER);
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("retries with the email and secret as a password when Jira rejects the secret as a token", async () => {
        fetchMock
            .mockResolvedValueOnce(myself(401))
            .mockResolvedValueOnce(myself(200, { ...JIRA_USER, emailAddress: "old@example.com" }));

        const res = await loginWithJira("old@example.com", "pa55word");

        expect(res.id).toBe("user-1");
        const basic = Buffer.from("old@example.com:pa55word").toString("base64");
        expect(fetchMock.mock.calls.map(([, init]) => init.headers.Authorization)).toEqual(["Bearer pa55word", `Basic ${basic}`]);
    });

    it("refuses a token whose owner is not the typed email", async () => {
        fetchMock.mockResolvedValueOnce(myself(200, { ...JIRA_USER, emailAddress: "someone-else@example.com" }));

        await expect(loginWithJira("old@example.com", "their-pat")).rejects.toMatchObject({ status: 401 });
        expect(prismaMock.identity.upsert).not.toHaveBeenCalled();
    });

    it("refuses with 401 and never calls Jira when no Jira url is configured", async () => {
        getJiraBaseUrlMock.mockResolvedValue(undefined);

        await expect(loginWithJira("old@example.com", "pa55word")).rejects.toMatchObject({ status: 401 });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
