import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
    $transaction: vi.fn(),
    user: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    identity: {
        updateMany: vi.fn(),
    },
}));

const authorizeMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/lib/token", () => ({ authorize: authorizeMock }));

import { usersExportRouter } from "@/server/routes/admin/users-export";
import { usersImportRouter } from "@/server/routes/admin/users-import";

function importRequest(csv: string) {
    return usersImportRouter.request("http://localhost/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
    });
}

function createdUsers() {
    return prismaMock.user.create.mock.calls.map(([{ data }]) => ({
        email: data.email,
        displayName: data.displayName,
        role: data.role,
    }));
}

describe("POST /users/import", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeMock.mockResolvedValue({ type: "jwt", decoded: { id: "admin-1", role: "admin" } });
        prismaMock.user.findMany.mockResolvedValue([]);
        prismaMock.user.create.mockImplementation((args: unknown) => args);
        prismaMock.$transaction.mockImplementation(async (write: (tx: typeof prismaMock) => Promise<void>) => write(prismaMock));
    });

    it("creates every row, as a viewer when the role is left empty", async () => {
        const res = await importRequest([
            "name,email,pass,role,id",
            "Kita,kita@example.com,secret1,,",
            "Ryo,ryo@example.com,secret2,admin,",
        ].join("\n"));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ created: 2, updated: 0 });
        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
        expect(createdUsers()).toEqual([
            { email: "kita@example.com", displayName: "Kita", role: "viewer" },
            { email: "ryo@example.com", displayName: "Ryo", role: "admin" },
        ]);
    });

    it("reads the cells missing at the end of a short row as empty, and refuses a row with extra cells", async () => {
        const res = await importRequest([
            "id,name,email,pass,role,active",
            ",Kita,kita@example.com,secret1",
            ",Ryo,ryo@example.com,secret2,admin,true,extra",
        ].join("\n"));

        expect(res.status).toBe(422);
        expect(await res.json()).toEqual({ errors: [{ line: 3, column: null, code: "cellCount" }] });

        const short = await importRequest([
            "id,name,email,pass,role,active",
            ",Kita,kita@example.com,secret1",
        ].join("\n"));

        expect(short.status).toBe(200);
        expect(createdUsers()).toEqual([{ email: "kita@example.com", displayName: "Kita", role: "viewer" }]);
    });

    it("creates nobody when any row is wrong, and names each row, column and reason", async () => {
        const res = await importRequest([
            "name,email,pass,role",
            "Kita,kita@example.com,secret1,viewer",
            ",not-an-email,short,editor",
            "Nijika,nijika@example.com,secret3,viewer",
        ].join("\n"));

        expect(res.status).toBe(422);
        expect(await res.json()).toEqual({
            errors: [
                { line: 3, column: "name", code: "required" },
                { line: 3, column: "email", code: "invalid" },
                { line: 3, column: "pass", code: "tooShort", params: { min: 6 } },
                { line: 3, column: "role", code: "notOneOf", params: { values: "viewer, admin" } },
            ],
        });
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("points a duplicate email at the row it repeats, and refuses an email already in use", async () => {
        prismaMock.user.findMany.mockResolvedValue([{ id: "user-9", email: "bocchi@example.com" }]);

        const res = await importRequest([
            "name,email,pass",
            "Kita,kita@example.com,secret1",
            "Bocchi,bocchi@example.com,secret2",
            "Kita 2,kita@example.com,secret3",
        ].join("\n"));

        expect(res.status).toBe(422);
        expect(await res.json()).toEqual({
            errors: [
                { line: 3, column: "email", code: "emailTaken" },
                { line: 4, column: "email", code: "duplicateInFile", params: { otherLine: 2 } },
            ],
        });
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("refuses a file saved as Shift_JIS instead of UTF-8", async () => {
        // "山田" in Shift_JIS, decoded as UTF-8 the way the browser and the CLI read the file.
        const name = new TextDecoder().decode(new Uint8Array([0x8e, 0x52, 0x93, 0x63]));

        const res = await importRequest(`name,email,pass\n${name},yamada@example.com,secret1\n`);

        expect(res.status).toBe(422);
        expect(await res.json()).toEqual({ errors: [{ line: null, column: null, code: "notUtf8" }] });
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it("moves the password login to the new email when a row changes it", async () => {
        prismaMock.user.findMany.mockResolvedValueOnce([
            { id: "user-1", displayName: "Kita", email: "old@example.com", role: "viewer", active: true },
        ]);

        const res = await importRequest([
            "id,name,email,pass,role,active",
            "user-1,Kita,new@example.com,,viewer,true",
        ].join("\n"));

        expect(res.status).toBe(200);
        expect(prismaMock.identity.updateMany).toHaveBeenCalledWith({
            where: { userId: "user-1", provider: "password" },
            data: { providerUid: "new@example.com" },
        });
    });

    it("changes nothing when the exported file is imported as it is", async () => {
        prismaMock.user.findMany.mockResolvedValue([
            { id: "user-1", displayName: "User", email: "a@example.com", role: "admin", active: true },
            { id: "user-2", displayName: "User", email: "b@example.com", role: "viewer", active: false },
        ]);

        const exported = await (await usersExportRouter.request("http://localhost/")).text();
        const res = await importRequest(exported);

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ created: 0, updated: 0 });
    });
});
