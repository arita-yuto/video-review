// Shaders are inlined as bytes (turbopack.rules in next.config.ts); "raw" would read as a string
// but Turbopack gives it no default export.
declare module "*.vert" {
    const bytes: Uint8Array;
    export default bytes;
}

declare module "*.frag" {
    const bytes: Uint8Array;
    export default bytes;
}
