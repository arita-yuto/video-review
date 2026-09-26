import { resolveEnv } from "@/lib/env/helpers";

export const env = {
    PUBLIC_VIDEO_REVIEW_TITLE: process.env.NEXT_PUBLIC_VIDEO_REVIEW_TITLE ?? "VideoReview",
    PUBLIC_VIDEO_REVIEW_DESC: process.env.NEXT_PUBLIC_VIDEO_REVIEW_DESC ?? "Internal Video Review Tool",
    PUBLIC_LOGIN_BG_URL: resolveEnv(process.env.NEXT_PUBLIC_VIDEO_REVIEW_LOGIN_BG, process.env.NEXT_PUBLIC_LOGIN_BG),
} as const;
