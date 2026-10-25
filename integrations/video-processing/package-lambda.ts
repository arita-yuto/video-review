import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Bundles main-lambda.ts into the zip deploy-lambda.sh deploys. The Prisma client stays unbundled:
// its native engine is generated here for the Alpine (musl) image that runs the function.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(scriptDir, "../..");
const stageDir = path.join(scriptDir, "dist", "lambda");
const zipPath = path.join(scriptDir, "video-processing-lambda.zip");

function run(command: string, args: string[], cwd: string) {
    const result = spawnSync(command, args, { cwd, stdio: "inherit" });
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(" ")} failed${result.error ? `: ${result.error.message} (is ${command} installed?)` : ""}`);
    }
}

fs.rmSync(stageDir, { recursive: true, force: true });
fs.rmSync(zipPath, { force: true });
fs.mkdirSync(path.join(stageDir, "node_modules", "@prisma"), { recursive: true });

await build({
    entryPoints: { index: path.join(scriptDir, "main-lambda.ts") },
    outdir: stageDir,
    outExtension: { ".js": ".mjs" },
    bundle: true,
    platform: "node",
    format: "esm",
    target: ["node24"],
    tsconfig: path.join(scriptDir, "tsconfig.json"),
    external: ["@prisma/client"],
    // Bundled CommonJS dependencies call require(), which an ES module does not have by itself.
    banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
    logLevel: "info",
});

const repoSchema = fs.readFileSync(path.join(repoDir, "prisma", "schema.prisma"), "utf8");
const stagedSchema = repoSchema.replace(
    /generator client \{[^}]*\}/,
    [
        "generator client {",
        '  provider      = "prisma-client-js"',
        `  output        = "${path.join(stageDir, "node_modules", ".prisma", "client")}"`,
        '  binaryTargets = ["linux-musl-openssl-3.0.x"]',
        "}",
    ].join("\n"),
);
if (stagedSchema === repoSchema) {
    throw new Error("generator client block not found in prisma/schema.prisma");
}
const stageSchemaPath = path.join(stageDir, "schema.prisma");
fs.writeFileSync(stageSchemaPath, stagedSchema);
run("npx", ["prisma", "generate", "--schema", stageSchemaPath, "--generator", "client"], repoDir);
fs.rmSync(stageSchemaPath);

fs.cpSync(
    path.join(repoDir, "node_modules", "@prisma", "client"),
    path.join(stageDir, "node_modules", "@prisma", "client"),
    { recursive: true },
);

run("zip", ["-qr", zipPath, "index.mjs", "node_modules"], stageDir);
console.log(`wrote ${zipPath}`);
