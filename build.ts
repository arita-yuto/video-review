import { execSync } from "node:child_process";
import { mkdirSync, cpSync } from "fs";
import path from "path";
import fs from "fs";

const content = fs.readFileSync("package.json") as any;
const productName = JSON.parse(content).name
const isCiBuild = process.env.CI_BUILD === "true";
let outBase: string | undefined = process.env.VIDEO_REVIEW_BUILD_OUTPUT_DIR;
if (!outBase) {
    outBase = undefined;
}

function applyCiDefaults() {
    if (!isCiBuild) return;

    process.env.DATABASE_URL ??= "postgresql://localhost:5432/postgres";
    process.env.VIDEO_REVIEW_LOCAL_ROOTDIR ??= "/tmp/uploads";

    mkdirSync(process.env.VIDEO_REVIEW_LOCAL_ROOTDIR, { recursive: true });
}

async function build() {
    applyCiDefaults();
    mkdirSync("public", { recursive: true });
    execSync("npm install", { stdio: "inherit" });
    execSync("npm run prisma:generate", { stdio: "inherit" });
    execSync("next build", { stdio: "inherit" });
    execSync("npm run video-processing:build", { stdio: "inherit" });
}

async function defaultBuild() {
    await build();
}

async function buildAndCopy(outDir: string) {
    // create output directories.
    mkdirSync(outDir, { recursive: true });

    await build();

    // copy
    cpSync("package.json", path.join(outDir, "package.json"));
    cpSync(".env", path.join(outDir, ".env"));
    cpSync("maintenance", path.join(outDir, "maintenance"), { recursive: true });
    cpSync(".next", path.join(outDir, ".next"), { recursive: true });
    cpSync("node_modules", path.join(outDir, "node_modules"), { recursive: true });
    cpSync("public", path.join(outDir, "public"), { recursive: true });
    cpSync("integrations/video-processing/dist",
        path.join(outDir, "integrations/video-processing/dist"), { recursive: true }
    );
}

const main = async () => {
    if (isCiBuild) {
        console.log("CI_BUILD=true: running build-only mode.");
        await defaultBuild();
    } else if (!outBase) {
        console.log("Since VIDEO_REVIEW_BUILD_OUTPUT_DIR is not set, output will be directed to ProjectRoot.");
        await defaultBuild();
    } else {
        const outDir = path.join(outBase, productName);
        await buildAndCopy(outDir);
    }
    console.log(`\nsuccess build\n`);
};

main();
