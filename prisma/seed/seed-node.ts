import type { PrismaClient } from "@prisma/client";

export abstract class SeedNode<Parent> {
    private readonly children: SeedNode<unknown>[] = [];

    constructor(readonly parent: Parent) {}

    add<Child extends SeedNode<unknown>>(child: Child): Child {
        this.children.push(child);

        return child;
    }

    protected abstract insert(prisma: PrismaClient): Promise<void>;

    async run(prisma: PrismaClient): Promise<void> {
        await this.insert(prisma);

        for (const child of this.children) {
            await child.run(prisma);
        }
    }
}
