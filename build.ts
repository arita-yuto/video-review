import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "fs";

const isCiBuild = process.env.CI_BUILD === "true";

function applyCiDefaults() {
    if (!isCiBuild) return;

    process.env.DATABASE_URL ??= "postgresql://localhost:5432/postgres";
    process.env.VIDEO_REVIEW_LOCAL_ROOTDIR ??= "/tmp/uploads";

    mkdirSync(process.env.VIDEO_REVIEW_LOCAL_ROOTDIR, { recursive: true });
}

function checkedOutTag() {
    try {
        return execSync("git describe --tags --exact-match", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
        return undefined;
    }
}

async function build() {
    applyCiDefaults();
    // Keep the image build arg when present; otherwise take the checked-out tag.
    const tag = checkedOutTag();
    if (!process.env.VIDEO_REVIEW_BUILD_VERSION && tag) {
        process.env.VIDEO_REVIEW_BUILD_VERSION = tag;
    }
    // A build on top of the previous output can keep files the new build no longer writes.
    rmSync(".next", { recursive: true, force: true });
    mkdirSync("public", { recursive: true });
    execSync("npm install", { stdio: "inherit" });
    execSync("npm run prisma:generate", { stdio: "inherit" });
    execSync("next build", { stdio: "inherit" });
    execSync("npm run video-processing:build", { stdio: "inherit" });
}

const main = async () => {
    if (isCiBuild) {
        console.log("CI_BUILD=true: applying CI defaults.");
    }
    await build();
    console.log(`\nsuccess build\n`);
};

main();
