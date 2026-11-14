import type { PrismaClient, User } from "@prisma/client";
import { insertUser } from "./insert";
import { SeedNode } from "./seed-node";

const users = ["Bocchi", "Kita", "Ryo", "Nijika"];

export class RootNode extends SeedNode<null> {
    private readonly rows = new Map<string, User>();

    constructor() {
        super(null);
    }

    user(displayName: string): User {
        const row = this.rows.get(displayName);

        if (!row) {
            throw new Error(`Unknown seed user: ${displayName}`);
        }

        return row;
    }

    protected async insert(prisma: PrismaClient): Promise<void> {
        for (const displayName of users) {
            this.rows.set(displayName, await insertUser(prisma, displayName));
        }
    }
}
