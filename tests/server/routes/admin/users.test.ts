import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerError } from "@/server/lib/server-error";

// Prisma and authorize are mocked: the test pins the response shape the admin
// dialog relies on and the guard in front of it, not the database.
const prismaMock = vi.hoisted(() => ({
    user: {
        findMany: vi.fn(),
    },
}));

const authorizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", () => ({ authorize: authorizeMock }));

import { adminRouter } from "@/server/routes/admin";

const FIRST = {
    id: "user-1",
    email: "admin@example.com",
    displayName: "admin",
    role: "admin",
    avatarPath: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    active: true,
};

const SECOND = {
    id: "user-2",
    email: null,
    displayName: "sso-user",
    role: "viewer",
    avatarPath: "avatars/user-2.png",
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
    active: false,
};

function listRequest() {
    return adminRouter.request("http://localhost/users");
}

describe("GET /users", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeMock.mockResolvedValue({ type: "jwt" });
        prismaMock.user.findMany.mockResolvedValue([FIRST, SECOND]);
    });

    it("returns the users in creation order, without reaching identities", async () => {
        const res = await listRequest();

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.users.map((u: { id: string }) => u.id)).toEqual(["user-1", "user-2"]);
        expect(body.users[0]).toEqual({
            id: "user-1",
            email: "admin@example.com",
            displayName: "admin",
            role: "admin",
            avatarPath: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            active: true,
        });
        expect(body.users[1].email).toBeNull();

        expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
        const query = prismaMock.user.findMany.mock.calls[0][0];
        expect(query.orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }]);
        // Secret hashes live on Identity, which Prisma returns only when the query asks for the relation.
        expect(query.include).toBeUndefined();
    });

    it("returns 403 to non-admins without querying users", async () => {
        authorizeMock.mockRejectedValue(new ServerError("forbidden", 403));

        const res = await listRequest();

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({ error: "forbidden" });
        expect(prismaMock.user.findMany).not.toHaveBeenCalled();
    });
});
