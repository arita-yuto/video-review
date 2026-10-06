import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";

// The stored hash is checked with bcrypt, the way login checks it.
const prismaMock = vi.hoisted(() => ({
    identity: {
        findFirst: vi.fn(),
        update: vi.fn(),
    },
}));

const authorizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", () => ({ authorize: authorizeMock }));

import { adminRouter } from "@/server/routes/admin";

const ADMIN_ID = "admin-1";
const TARGET_ID = "user-2";

function resetRequest(body: unknown) {
    return adminRouter.request("http://localhost/user-password", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("PATCH /user-password", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        authorizeMock.mockResolvedValue({ type: "jwt", decoded: { id: ADMIN_ID, role: "admin" } });
        prismaMock.identity.findFirst.mockResolvedValue({
            id: "identity-2",
            userId: TARGET_ID,
            provider: "password",
            secretHash: await bcrypt.hash("forgotten", 10),
        });
    });

    it("stores a hash that matches the new password and no longer the old one", async () => {
        const res = await resetRequest({ userId: TARGET_ID, pass: "new-pass" });

        expect(res.status).toBe(200);
        expect(prismaMock.identity.findFirst).toHaveBeenCalledWith({
            where: { userId: TARGET_ID, provider: "password" },
        });

        const { where, data } = prismaMock.identity.update.mock.calls[0][0];
        expect(where).toEqual({ id: "identity-2" });
        expect(await bcrypt.compare("new-pass", data.secretHash)).toBe(true);
        expect(await bcrypt.compare("forgotten", data.secretHash)).toBe(false);
    });

    it("refuses an admin's own password, which must be changed with the current one", async () => {
        const res = await resetRequest({ userId: ADMIN_ID, pass: "new-pass" });

        expect(res.status).toBe(403);
        expect(prismaMock.identity.update).not.toHaveBeenCalled();
    });
});
