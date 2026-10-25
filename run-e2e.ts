import { execSync } from "node:child_process";
import fs from "node:fs";

function run(cmd: string): void {
    execSync(cmd, {
        stdio: "inherit",
        env: process.env,
    });
}

// The bootstrap spec needs a database that was never seeded.
function resetDb({ seed }: { seed: boolean }): void {
    run("npx prisma migrate reset --force --skip-seed --skip-generate");
    run("npx prisma generate --generator client");
    if (seed) {
        run("npm run prisma:seed");
    }
}

// Two Playwright passes: the secret cache in src/server/lib/token.ts is
// process-wide, so the first-launch specs need their own server and an
// unseeded database. Each `playwright test` starts its own `next start`.
async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing. Load .env.test before running e2e.");
    }

    const target = process.argv[2];

    // The local storage driver falls back to ./uploads when the root is missing at startup.
    if (process.env.VIDEO_REVIEW_LOCAL_ROOTDIR) {
        fs.mkdirSync(process.env.VIDEO_REVIEW_LOCAL_ROOTDIR, { recursive: true });
    }

    // Not just --generator client: next build imports the gitignored src/schema zod output.
    console.log("[e2e] generating prisma artifacts...");
    run("npm run prisma:generate");

    console.log("[e2e] building app (next build)...");
    run("npx next build");

    if (target) {
        // Only the bootstrap spec starts from an empty database.
        const needsEmptyDb = target.includes("bootstrap");
        console.log(`[e2e] resetting test database (seed: ${!needsEmptyDb})...`);
        resetDb({ seed: !needsEmptyDb });
        run(`npx playwright test ${target}`);
        return;
    }

    console.log("[e2e] pass 1/2: first-launch specs against an unseeded database...");
    resetDb({ seed: false });
    process.env.E2E_JUNIT_FILE = "tests/test-results/e2e-junit-bootstrap.xml";
    run("npx playwright test --grep @bootstrap");
    delete process.env.E2E_JUNIT_FILE;

    console.log("[e2e] pass 2/2: remaining specs against a seeded database...");
    resetDb({ seed: true });
    run("npx playwright test --grep-invert @bootstrap");
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
