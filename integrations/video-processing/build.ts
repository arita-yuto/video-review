import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(scriptDir, "dist");

if (fs.existsSync(outdir)) {
    fs.rmSync(outdir, { recursive: true, force: true });
}

await build({
    entryPoints: {
        "main-local": path.join(scriptDir, "main-local.ts"),
        "main-lambda": path.join(scriptDir, "main-lambda.ts"),
    },
    outdir,
    bundle: true,
    platform: "node",
    format: "esm",
    target: ["node20"],
    sourcemap: false,
    tsconfig: path.join(scriptDir, "tsconfig.json"),
    // The release zip runs the worker from the web server's standalone node_modules, which hold only what Next traced.
    external: ["@prisma/client"],
    // Bundled CommonJS dependencies call require(), which an ES module does not have by itself.
    banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
    logLevel: "info",
});
