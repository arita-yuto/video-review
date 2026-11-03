import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    env: { VIDEO_REVIEW_BUILD_VERSION: process.env.VIDEO_REVIEW_BUILD_VERSION || "dev" },
    // The dev server hands its scripts only to pages opened from localhost; a phone on the LAN opens
    // the PC's address instead, so that address has to be listed (comma-separated).
    allowedDevOrigins: process.env.VIDEO_REVIEW_DEV_ORIGINS?.split(",").map((o) => o.trim()).filter((o) => o !== ""),
    turbopack: {
        rules: {
            // WebGL shaders, inlined as bytes and decoded to text where they are compiled.
            "*.{vert,frag}": { type: "bytes" },
        },
    },
};
export default nextConfig;
