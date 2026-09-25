import type { LoginType } from "@/lib/auth-types";
import { resolveEnv, typeEnv, arrayEnv } from "@/lib/env/helpers";

export const env = {
    PUBLIC_VIDEO_REVIEW_TITLE: process.env.NEXT_PUBLIC_VIDEO_REVIEW_TITLE ?? "VideoReview",
    PUBLIC_VIDEO_REVIEW_DESC: process.env.NEXT_PUBLIC_VIDEO_REVIEW_DESC ?? "Internal Video Review Tool",
    PUBLIC_VIDEO_REVIEW_URL_SCHEMA: resolveEnv(process.env.NEXT_PUBLIC_VIDEO_REVIEW_URL_SCHEMA, process.env.NEXT_PUBLIC_URL_SCHEMA),
    PUBLIC_LOGIN_BG_URL: resolveEnv(process.env.NEXT_PUBLIC_VIDEO_REVIEW_LOGIN_BG, process.env.NEXT_PUBLIC_LOGIN_BG),
    PUBLIC_LOGIN_DEFAULT_TYPE: typeEnv<LoginType>(resolveEnv(process.env.NEXT_PUBLIC_VIDEO_REVIEW_LOGIN_DEFAULT_TYPE, process.env.NEXT_PUBLIC_LOGIN_DEFAULT_TYPE) , "guest"),
    PUBLIC_ALLOW_GUEST: process.env.NEXT_PUBLIC_VIDEO_REVIEW_ALLOW_GUEST !== "false",
    RESOLUTION_PRESETS: arrayEnv<number>(process.env.NEXT_PUBLIC_VIDEO_REVIEW_RESOLUTION_PRESETS, Number),
} as const;
