import { PrismaClient } from "@prisma/client";
import { DemoNode } from "./demo";
import { EvalNode } from "./eval";
import { RootNode } from "./user";

const prisma = new PrismaClient();

async function main() {
    const datasets = { demo: DemoNode, eval: EvalNode };
    const only = process.argv[2];

    if (only && !Object.hasOwn(datasets, only)) {
        throw new Error(`Unknown dataset "${only}". Use one of: ${Object.keys(datasets).join(", ")}`);
    }

    const root = new RootNode();

    for (const [name, Dataset] of Object.entries(datasets)) {
        if (!only || only === name) {
            root.add(new Dataset(root));
        }
    }

    console.log(`Seeding ${only ?? Object.keys(datasets).join(" and ")}...`);
    await root.run(prisma);
    console.log("Done.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
