import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
    user: {
        findMany: vi.fn(),
    },
}));

const authorizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", () => ({ authorize: authorizeMock }));

import { usersExportRouter } from "@/server/routes/admin/users-export";

describe("GET /users/export", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeMock.mockResolvedValue({ type: "jwt", decoded: { id: "admin-1", role: "admin" } });
        prismaMock.user.findMany.mockResolvedValue([
            { id: "user-1", displayName: "Kita", email: "kita@example.com", role: "admin", active: true },
            { id: "user-2", displayName: "Yamada, Ryo", email: "ryo@example.com", role: "viewer", active: false },
        ]);
    });

    it("lists only password users, with the pass column left empty", async () => {
        const res = await usersExportRouter.request("http://localhost/");

        expect(res.status).toBe(200);
        const bytes = new Uint8Array(await res.arrayBuffer());
        // The UTF-8 BOM, which Excel needs to read the names correctly.
        expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
        expect(new TextDecoder().decode(bytes)).toBe([
            "id,name,email,pass,role,active",
            "user-1,Kita,kita@example.com,,admin,true",
            "user-2,\"Yamada, Ryo\",ryo@example.com,,viewer,false",
            "",
        ].join("\r\n"));
        expect(prismaMock.user.findMany.mock.calls[0][0].where).toEqual({
            identities: { some: { provider: "password" } },
        });
    });
});
