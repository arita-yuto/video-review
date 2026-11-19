import { beforeEach, describe, expect, it, vi } from "vitest";
import { hash } from "crypto";

const state = vi.hoisted(() => ({
    dbHash: undefined as string | undefined,
    env: {
        VIDEO_REVIEW_API_TOKEN: undefined as string | undefined,
        JWT_SECRET_deprecated: undefined as string | undefined,
    },
}));

const createMany = vi.hoisted(() => vi.fn());

vi.mock("@/server/lib/env", () => ({ env: state.env }));

vi.mock("@/server/lib/db", () => ({
    prisma: {
        systemSecret: {
            findUnique: vi.fn(async () => (state.dbHash === undefined ? null : { valueHash: state.dbHash })),
            createMany,
        },
    },
}));

// Re-imported per test: the env token is read when the module loads, and the secret cache is per module.
let authorize: typeof import("@/server/lib/token").authorize;

function withApiToken(token: string) {
    return new Request("http://localhost/", { headers: { "x-api-token": token } });
}

describe("authorize with x-api-token", () => {
    beforeEach(() => {
        state.dbHash = undefined;
        state.env.VIDEO_REVIEW_API_TOKEN = undefined;
    });

    it("rejects the stored hash sent as the token", async () => {
        state.dbHash = hash("sha256", "real-token");
        vi.resetModules();
        ({ authorize } = await import("@/server/lib/token"));

        await expect(authorize(withApiToken(state.dbHash), ["admin"])).rejects.toMatchObject({ status: 401, message: "invalid api token" });
    });

    it("accepts the plain token set in env when the DB has none", async () => {
        state.env.VIDEO_REVIEW_API_TOKEN = "env-token";
        vi.resetModules();
        ({ authorize } = await import("@/server/lib/token"));

        await expect(authorize(withApiToken("env-token"), ["admin"])).resolves.toMatchObject({ type: "api-token" });
    });
});

describe("getJwtSecret", () => {
    beforeEach(() => {
        state.dbHash = undefined;
        state.env.JWT_SECRET_deprecated = undefined;

        createMany.mockReset();
        // Stands in for the unique key: a row that is already there wins over the insert.
        createMany.mockImplementation(async ({ data }) => {
            state.dbHash ??= data[0].valueHash;
        });
    });

    it("creates and stores the secret when neither the DB nor env has one", async () => {
        vi.resetModules();
        const { getJwtSecret } = await import("@/server/lib/token");

        const secret = await getJwtSecret();

        expect(createMany).toHaveBeenCalledTimes(1);
        expect(createMany.mock.calls[0][0]).toMatchObject({ data: [{ key: "JWT_SECRET" }], skipDuplicates: true });
        expect(secret).toBe(state.dbHash);
        expect(secret).toMatch(/^[0-9a-f]{64}$/);

        await expect(getJwtSecret()).resolves.toBe(secret);
        expect(createMany).toHaveBeenCalledTimes(1);
    });

    it("returns the row another process inserted first", async () => {
        createMany.mockImplementation(async () => {
            state.dbHash = "inserted-by-the-other-process";
        });
        vi.resetModules();
        const { getJwtSecret } = await import("@/server/lib/token");

        await expect(getJwtSecret()).resolves.toBe("inserted-by-the-other-process");
    });

    it("keeps the env secret without writing to the DB", async () => {
        state.env.JWT_SECRET_deprecated = "env-secret";
        vi.resetModules();
        const { getJwtSecret } = await import("@/server/lib/token");

        await expect(getJwtSecret()).resolves.toBe("env-secret");
        expect(createMany).not.toHaveBeenCalled();
    });
});
