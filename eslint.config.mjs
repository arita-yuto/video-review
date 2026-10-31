import { plugin as shadcn } from "@shadcn/lint";
import tsParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import path from "node:path";

// A store or hook is read only from inside the directory that holds its stores/ or hooks/ folder,
// so state sits at the lowest height that covers every reader (see CLAUDE.md, Frontend).
const storeHeight = {
    meta: { type: "problem", schema: [] },
    create(context) {
        const file = path.relative(context.cwd, context.filename).replaceAll("\\", "/");
        const rel = file.replace(/^src\//, "");
        return {
            ImportDeclaration(node) {
                const match = /^@\/components\/((?:.*\/)?)(?:stores|hooks)\//.exec(node.source.value);
                if (!match) {
                    return;
                }
                const owner = "components/" + match[1];
                if (rel.startsWith(owner)) {
                    return;
                }
                // Pages mount the screens: they may read app-wide state and the screen they mount.
                if (rel.startsWith("app/") && (owner === "components/" || owner === "components/review/")) {
                    return;
                }
                context.report({ node, message: `${node.source.value} is read only from inside src/${owner}` });
            },
        };
    },
};

const uiAliases = ["@/components/*", "@/ui/*", "@/app/*", "@/web/*", "@/api/*"];
const serverAliases = ["@/server", "@/server/*"];

export default defineConfig([
    {
        files: ["src/**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { shadcn, local: { rules: { "store-height": storeHeight } } },
        // Colours, spacing and shapes come from the tokens in src/styles/globals.css and the
        // wrappers in src/components/ui; a finding means a hand-written exception crept back in.
        rules: {
            "local/store-height": "error",
            "shadcn/no-restyle": ["error", {
                allow: ["layout", "typography"],
                // A popover that wraps a Command list has no padding of its own.
                contracts: [
                    { pattern: "^PopoverContent$", allow: ["layout", "p-0"] },
                    // An icon overlaid inside the field needs room on the left.
                    { pattern: "^(Input|SidebarInput)$", allow: ["layout", "typography", "pl-8"] },
                    // The hover card must not exceed the viewport; the utility is declared in globals.css.
                    { pattern: "^HoverCardContent$", allow: ["layout", "max-w-screen-gutter"] },
                    // The side panel's tab list sits flush against its content.
                    { pattern: "^Tabs$", allow: ["layout", "gap-0"] },
                    // The spinner inherits currentColor; the accent is the only colour it takes.
                    { pattern: "^Spinner$", allow: ["layout", "text-primary"] },
                    // The chat sheet's header holds a button row: shorter than stock, with a rule below.
                    { pattern: "^SheetHeader$", allow: ["layout", "border-b", "py-2"] },
                ],
            }],
            "shadcn/no-raw-colors": "error",
            "shadcn/no-arbitrary-values": "error",
            "shadcn/no-inline-styles": "error",
            "shadcn/no-unknown-classes": "error",
            "shadcn/require-static-classes": "error",
        },
    },
    {
        // Layers: lib sits below both the UI and the server, and the server never reaches the UI.
        files: ["src/lib/**/*.{ts,tsx}"],
        rules: {
            "no-restricted-imports": ["error", {
                patterns: [
                    { group: uiAliases, message: "lib does not import the UI" },
                    { group: serverAliases, message: "lib does not import the server" },
                ],
            }],
        },
    },
    {
        // The API client is typed by the routers; a type import leaves nothing in the bundle.
        files: ["src/lib/api-client.ts"],
        rules: {
            "no-restricted-imports": ["error", {
                patterns: [
                    { group: uiAliases, message: "lib does not import the UI" },
                    { group: serverAliases, message: "lib does not import the server", allowTypeImports: true },
                ],
            }],
        },
    },
    {
        files: ["src/server/**/*.{ts,tsx}"],
        rules: {
            "no-restricted-imports": ["error", {
                patterns: [
                    { group: uiAliases, message: "the server does not import the UI" },
                ],
            }],
        },
    },
    {
        // Guest-admitting routes about one video or comment go through authorizeVideo / authorizeVideoMedia / authorizeComment; list routes opt out per call.
        files: ["src/server/routes/{comments,read-status,videos}/**/*.ts"],
        rules: {
            "no-restricted-syntax": ["error", {
                selector: "CallExpression[callee.name=/^authorize(Media)?$/] > ArrayExpression > Literal[value='guest']",
                message: "A guest-admitting route goes through authorizeVideo / authorizeVideoMedia / authorizeComment; a list route filters by guestVisible and declares it with eslint-disable.",
            }],
        },
    },
    {
        // The wrappers are the one place that may restyle primitives, and the stock shadcn
        // classes use arbitrary values (ring-[3px], p-[3px]) that the theme has no token for.
        files: ["src/components/ui/**/*.tsx"],
        rules: {
            "shadcn/no-restyle": "off",
            "shadcn/no-arbitrary-values": "off",
            "shadcn/require-static-classes": "off",
        },
    },
]);
