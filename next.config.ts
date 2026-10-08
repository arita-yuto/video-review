import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    turbopack: {
        rules: {
            // WebGL shaders, inlined as bytes and decoded to text where they are compiled.
            "*.{vert,frag}": { type: "bytes" },
        },
    },
};
export default nextConfig;
