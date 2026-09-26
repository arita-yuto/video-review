import { beforeEach, describe, expect, it, vi } from "vitest";

// The first-launch contract documented in documents/admin/README.md.
// Prisma is mocked so this never empties the shared test database.
const prismaMock = vi.hoisted(() => ({
    user: {
        count: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    systemSecret: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
    },
}));

vi.mock("@/server/lib/db", () => ({ prisma: prismaMock }));

import { adminRouter } from "@/server/routes/admin";

const VALID = { email: "admin@example.com", pass: "bootstrap-pass" };

function bootstrapRequest(body: unknown) {
    return adminRouter.request("http://localhost/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("POST /bootstrap", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default state: an instance nobody has set up yet.
        prismaMock.user.count.mockResolvedValue(0);
        prismaMock.systemSecret.findUnique.mockResolvedValue(null);
        prismaMock.systemSecret.create.mockResolvedValue({});
        prismaMock.user.create.mockResolvedValue({});
    });

    it("creates the first user with the admin role", async () => {
        const res = await bootstrapRequest(VALID);

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ success: true });

        expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
        const created = prismaMock.user.create.mock.calls[0][0].data;
        expect(created.role).toBe("admin");
        expect(created.email).toBe(VALID.email);
        // The password is stored hashed, never in the clear.
        expect(created.identities.create.secretHash).not.toBe(VALID.pass);
    });

    it("creates the JWT signing secret in the same call", async () => {
        await bootstrapRequest(VALID);

        expect(prismaMock.systemSecret.create).toHaveBeenCalledTimes(1);
        expect(prismaMock.systemSecret.create.mock.calls[0][0].data.key).toBe("JWT_SECRET");
    });

    it("refuses a second call once a user exists", async () => {
        prismaMock.user.count.mockResolvedValue(1);

        const res = await bootstrapRequest({ email: "second@example.com", pass: "another-pass" });

        expect(res.status).toBe(410);
        await expect(res.json()).resolves.toEqual({ error: "Already initialized" });
        expect(prismaMock.user.create).not.toHaveBeenCalled();
        expect(prismaMock.systemSecret.create).not.toHaveBeenCalled();
    });

    it("refuses a call when the JWT secret already exists", async () => {
        prismaMock.systemSecret.findUnique.mockResolvedValue({
            key: "JWT_SECRET",
            valueHash: "existing",
        });

        const res = await bootstrapRequest(VALID);

        expect(res.status).toBe(410);
        expect(prismaMock.user.create).not.toHaveBeenCalled();
        expect(prismaMock.systemSecret.create).not.toHaveBeenCalled();
    });

    it("rejects a password shorter than the 6 characters the admin guide states", async () => {
        const res = await bootstrapRequest({ email: VALID.email, pass: "12345" });

        expect(res.status).toBe(400);
        expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("rejects a request with no credentials", async () => {
        const res = await bootstrapRequest({});

        expect(res.status).toBe(400);
        expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
});
