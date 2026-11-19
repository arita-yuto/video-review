import { PrismaClient } from "@prisma/client";
import { seedDemo } from "./demo";
import { seedEval } from "./eval";
import { insertUsers } from "./user";

const prisma = new PrismaClient();

async function main() {
    const datasets = { demo: seedDemo, eval: seedEval };
    const datasetNames = Object.keys(datasets);
    const only = process.argv[2];

    if (only && !datasetNames.includes(only)) {
        throw new Error(`Unknown dataset "${only}". Use one of: ${datasetNames.join(", ")}`);
    }

    console.log(`Seeding ${only ?? datasetNames.join(" and ")}...`);

    const users = await insertUsers(prisma);

    for (const [name, seed] of Object.entries(datasets)) {
        if (!only || only === name) {
            await seed(prisma, users);
        }
    }

    console.log("Done.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
