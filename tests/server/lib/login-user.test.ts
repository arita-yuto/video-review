import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";

const prismaMock = vi.hoisted(() => ({
    identity: {
        findUnique: vi.fn(),
    },
}));

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", () => ({ signToken: vi.fn(async () => "token") }));

import { loginUser } from "@/server/lib/login/user";

const EMAIL = "disabled@example.com";

describe("loginUser with a disabled user", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        prismaMock.identity.findUnique.mockResolvedValue({
            secretHash: await bcrypt.hash("right-pass", 10),
            user: { id: "user-2", displayName: "disabled", role: "viewer", active: false },
        });
    });

    it("refuses the correct password with 403", async () => {
        await expect(loginUser({ displayName: "", email: EMAIL, password: "right-pass" }))
            .rejects.toMatchObject({ status: 403 });
    });

    it("answers a wrong password with 401, as for an active user", async () => {
        await expect(loginUser({ displayName: "", email: EMAIL, password: "wrong-pass" }))
            .rejects.toMatchObject({ status: 401 });
    });
});
