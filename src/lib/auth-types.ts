import { Role } from "@/lib/role";

// How the current session authenticated. One vocabulary across the DB Identity.provider,
// the JWT `provider` claim, and the login routes.
export type LoginType = "guest" | "jira" | "password";

export const MIN_PASSWORD_LENGTH = 6;

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