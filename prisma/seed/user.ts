import type { PrismaClient, User } from "@prisma/client";
import { insertUser } from "./insert";

const users = ["Bocchi", "Kita", "Ryo", "Nijika"];

export type SeedUsers = { user(displayName: string): User };

export async function insertUsers(prisma: PrismaClient): Promise<SeedUsers> {
    const rows = new Map<string, User>();

    for (const displayName of users) {
        rows.set(displayName, await insertUser(prisma, displayName));
    }

    return {
        user(displayName) {
            const row = rows.get(displayName);

            if (!row) {
                throw new Error(`Unknown seed user: ${displayName}`);
            }

            return row;
        },
    };
}
