import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
    user: {
        updateMany: vi.fn(),
    },
}));

const authorizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", () => ({ authorize: authorizeMock }));

import { adminRouter } from "@/server/routes/admin";

const ADMIN_ID = "admin-1";
const TARGET_ID = "user-2";

function activeRequest(body: unknown) {
    return adminRouter.request("http://localhost/user-active", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("PATCH /user-active", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeMock.mockResolvedValue({ type: "jwt", decoded: { id: ADMIN_ID, role: "admin" } });
        prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
    });

    it("disables the user without removing the row", async () => {
        const res = await activeRequest({ userId: TARGET_ID, active: false });

        expect(res.status).toBe(200);
        expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
            where: { id: TARGET_ID },
            data: { active: false },
        });
    });

    it("refuses to disable the admin making the request", async () => {
        const res = await activeRequest({ userId: ADMIN_ID, active: false });

        expect(res.status).toBe(403);
        expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
    });

    it("returns 404 for an unknown user", async () => {
        prismaMock.user.updateMany.mockResolvedValue({ count: 0 });

        const res = await activeRequest({ userId: "missing", active: false });

        expect(res.status).toBe(404);
    });
});
