import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

const entries = {
    web: "server.js",
    worker: "worker/main-local.js",
};

const role = process.argv[2];
if (!(role in entries) && role !== "migrate") {
    console.error(`usage: node start.js <${Object.keys(entries).join("|")}|migrate>`);
    process.exit(1);
}

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
// The release is unpacked at <install>/releases/<tag>/, next to the .env, secrets/ and uploads/ it keeps across updates.
const installDir = path.resolve(releaseDir, "..", "..");

const envFile = path.join(installDir, ".env");
if (fs.existsSync(envFile)) {
    // The .env wins over inherited variables, so a release the old web's CLI starts gets the current values.
    Object.assign(process.env, parseEnv(fs.readFileSync(envFile, "utf8")));
}

// server.js listens on HOSTNAME, which shells and containers set to the machine name; next start listens everywhere.
process.env.HOSTNAME = "0.0.0.0";
process.env.PORT ??= "3489";

// The app keeps secrets/ and uploads/ under the folder it runs from, as it does when started from a source checkout.
process.chdir(installDir);

if (role === "migrate") {
    const migrateDir = path.join(releaseDir, "migrate");
    // prisma's build/index.js reads files next to itself, which node_modules/.bin/prisma reaches only through a link.
    const cli = path.join(migrateDir, "node_modules", "prisma", "build", "index.js");
    const schema = path.join(migrateDir, "prisma", "schema.prisma");
    const result = spawnSync(process.execPath, [cli, "migrate", "deploy", "--schema", schema], { stdio: "inherit" });
    process.exit(result.status ?? 1);
}

await import(pathToFileURL(path.join(releaseDir, entries[role])).href);
// server.js chdirs to its own folder on load; chdir back before the server resolves secrets/ and uploads/.
process.chdir(installDir);
