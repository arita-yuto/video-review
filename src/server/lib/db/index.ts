import { PrismaClient } from "@prisma/client";
import { styleText } from "node:util";
import { env } from "@/server/lib/env";

const defaultLogThreshold = 20;
const isDev = process.env.NODE_ENV === "development";

// How long (ms) an idle connection is kept before disconnecting.
// Avoids holding a connection open on auto-pausing cloud DBs (Aurora
// Serverless v2, Neon, ...) so they can scale down. <= 0 disables it.
const idleDisconnectMs = (() => {
    const raw = env.DB_IDLE_DISCONNECT_MS;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : 30_000;
})();

function createPrismaClient() {
    if (!env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not set in environment variables.");
    }

    const client = new PrismaClient({
        log: isDev
            ? [
                  { level: "query", emit: "event" },
                  { level: "error", emit: "stdout" },
                  { level: "warn", emit: "stdout" },
              ]
            : [
                  { level: "error", emit: "stdout" },
                  { level: "warn", emit: "stdout" },
              ],
    });

    if (isDev) {
        client.$on("query", (e) => {
            if (e.duration < defaultLogThreshold) return;

            const dur = (() => {
                if (e.duration < defaultLogThreshold * 1.1)
                    return styleText("green", `${e.duration}ms`);
                if (e.duration < defaultLogThreshold * 1.2)
                    return styleText("blue", `${e.duration}ms`);
                if (e.duration < defaultLogThreshold * 1.3)
                    return styleText("yellow", `${e.duration}ms`);
                if (e.duration < defaultLogThreshold * 1.4)
                    return styleText("redBright", `${e.duration}ms`);
                return styleText("red", `${e.duration}ms`);
            })();

            console.info(`prisma:query - ${dur} - ${e.query}`);
        });
    }

    // Idle auto-disconnect: reset a timer on every query and $disconnect()
    // once no query runs for the idle window. Prisma reconnects on next query.
    let idleTimer: NodeJS.Timeout | null = null;
    let inFlight = 0;

    const armIdleDisconnect = () => {
        if (idleDisconnectMs <= 0) return;
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            idleTimer = null;
            // Non-fatal on failure: the next query reconnects automatically.
            void client.$disconnect().catch(() => {});
        }, idleDisconnectMs);
        // Don't let the idle timer alone keep the process alive.
        idleTimer.unref?.();
    };

    return client.$extends({
        query: {
            async $allOperations({ args, query }) {
                inFlight++;
                if (idleTimer) {
                    clearTimeout(idleTimer);
                    idleTimer = null;
                }
                try {
                    return await query(args);
                } finally {
                    inFlight--;
                    // Only arm the timer once no query is in flight.
                    if (inFlight === 0) armIdleDisconnect();
                }
            },
        },
    });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
    prisma?: ExtendedPrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;

export async function ensurePrismaWarmup() {
    try {
        await prisma.$connect();
        // eslint-disable-next-line no-restricted-syntax -- wakes a paused database without reading a table
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch {
        return false;
    }
}
