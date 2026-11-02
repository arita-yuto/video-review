import { Role } from "@/lib/role";

// How the current session authenticated. One vocabulary across the DB Identity.provider,
// the JWT `provider` claim, and the login routes.
export const LOGIN_TYPES = ["guest", "password", "oidc"] as const;
export type LoginType = typeof LOGIN_TYPES[number];

export const MIN_PASSWORD_LENGTH = 6;

// Mount point of the OAuth routes; shared so the browser and the server spell the callback URL the same way.
export const OAUTH_PATH = "/api/v1/auth/oauth";

export interface LoginRequest {
    displayName: string;
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    id: string;
    email?: string;
    displayName: string;
    role: Role
    provider: LoginType
}