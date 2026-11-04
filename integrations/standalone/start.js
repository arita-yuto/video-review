import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const entries = {
    web: "server.js",
    worker: "worker/main-local.js",
};

const role = process.argv[2];
if (!(role in entries)) {
    console.error(`usage: node start.js <${Object.keys(entries).join("|")}>`);
    process.exit(1);
}

const releaseDir = path.dirname(fileURLToPath(import.meta.url));
// The release is unpacked at <install>/releases/<tag>/, next to the .env, secrets/ and uploads/ it keeps across updates.
const installDir = path.resolve(releaseDir, "..", "..");

const envFile = path.join(installDir, ".env");
if (fs.existsSync(envFile)) {
    process.loadEnvFile(envFile);
}

// server.js listens on HOSTNAME, which shells and containers set to the machine name; next start listens everywhere.
process.env.HOSTNAME = "0.0.0.0";
process.env.PORT ??= "3489";

// The app keeps secrets/ and uploads/ under the folder it runs from, as it does when started from a source checkout.
process.chdir(installDir);
await import(pathToFileURL(path.join(releaseDir, entries[role])).href);
// server.js chdirs to its own folder on load; chdir back before the server resolves secrets/ and uploads/.
process.chdir(installDir);
