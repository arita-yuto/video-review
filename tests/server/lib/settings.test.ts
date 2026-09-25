import { beforeEach, describe, expect, it, vi } from "vitest";

// SystemSetting is kept in memory so the real reader and its cache are exercised.
const rows = vi.hoisted(() => new Map<string, unknown>());

vi.mock("@/server/lib/db", () => ({
    prisma: {
        systemSetting: {
            findUnique: vi.fn(async ({ where }: { where: { key: string } }) =>
                rows.has(where.key) ? { key: where.key, value: rows.get(where.key) } : null),
            upsert: vi.fn(async ({ where, update }: { where: { key: string }; update: { value: unknown } }) => {
                rows.set(where.key, update.value);
                return { key: where.key, value: update.value };
            }),
        },
    },
}));

// Re-imported per test so each starts with an empty cache.
let settings: typeof import("@/server/lib/settings");

describe("settings", () => {
    beforeEach(async () => {
        rows.clear();
        vi.resetModules();
        settings = await import("@/server/lib/settings");
    });

    it("prefers the value saved from the admin screen over env", async () => {
        rows.set("jira.baseUrl", "https://saved.example.com");

        expect(await settings.getSetting("jira.baseUrl", "https://env.example.com")).toBe("https://saved.example.com");
    });

    it("falls back to env when nothing is saved", async () => {
        expect(await settings.getSetting("jira.baseUrl", "https://env.example.com")).toBe("https://env.example.com");
    });

    it("returns the new value right after saving", async () => {
        // Read first, so a stale cache entry exists, as it would on a running server.
        expect(await settings.getSetting("jira.baseUrl", "https://env.example.com")).toBe("https://env.example.com");

        await settings.saveSetting("jira.baseUrl", "https://saved.example.com");

        expect(await settings.getSetting("jira.baseUrl", "https://env.example.com")).toBe("https://saved.example.com");
    });
});
