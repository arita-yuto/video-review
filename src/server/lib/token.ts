import { Role } from "@/lib/role";
import jwt, { JwtPayload } from "jsonwebtoken";
import { prisma } from "@/server/lib/db";
import { ServerError } from "@/server/lib/server-error";
import { env } from "@/server/lib/env";
import "server-only"
import { hash, randomBytes, timingSafeEqual } from "crypto";
import { Context } from "hono";
import { getCookie } from "hono/cookie";

export const AUTH_COOKIE = "video_review_token";

type SecretKey = {
    dbKey: string;
    envKey: string | undefined;
};

export const Secrets = {
    JWT: { dbKey: "JWT_SECRET", envKey: env.JWT_SECRET_deprecated },
    // The DB stores only the hash, so the env token is hashed too and callers always compare hashes.
    API: { dbKey: "API_TOKEN", envKey: env.VIDEO_REVIEW_API_TOKEN && hash("sha256", env.VIDEO_REVIEW_API_TOKEN) },
} as const;

const cache = new Map<string, string>();


async function loadFromDb(name: string) {
    const token = await prisma.systemSecret.findUnique({
        where: { key: name },
    });
    return token?.valueHash;
}

export async function getSecret({ dbKey, envKey }: SecretKey): Promise<string | undefined> {
    const cached = cache.get(dbKey);
    if (cached) return cached;

    const fromDb = await loadFromDb(dbKey);
    if (fromDb) {
        cache.set(dbKey, fromDb);
        return fromDb;
    }

    const fromEnv = envKey;
    if (!fromEnv) {
        return undefined;
    }

    cache.set(dbKey, fromEnv);
    return fromEnv;
}

// Call after writing a SystemSecret row; otherwise this process keeps serving the old
// value until restart, and a rotated API token would never actually be revoked.
export function invalidateSecret({ dbKey }: SecretKey) {
    cache.delete(dbKey);
}

export async function getJwtSecret(): Promise<string> {
    const existing = await getSecret(Secrets.JWT);
    if (existing) {
        return existing;
    }

    await prisma.systemSecret.createMany({
        data: [{ key: Secrets.JWT.dbKey, valueHash: hash("sha256", randomBytes(64).toString("hex")) }],
        skipDuplicates: true,
    });

    // Read back instead of returning the new value: another process may have inserted first.
    const created = await getSecret(Secrets.JWT);
    if (!created) {
        throw new ServerError("jwt configuration is missing", 500);
    }

    return created;
}

export const getApiSecretHash = () => getSecret(Secrets.API);

export async function isInitialized() {
    return await prisma.user.count() > 0;
}

export async function verifyToken(token: string): Promise<JwtPayload> {
    const decoded = jwt.verify(token, await getJwtSecret());
    if (typeof decoded === "string") {
        throw new ServerError("invalid token payload", 401);
    }

    return decoded;
}

export async function signToken(payload: Record<string, any>): Promise<string> {
    return jwt.sign(payload, await getJwtSecret(), { expiresIn: "1d" });
}

function matchesHash(token: string, storedHash: string) {
    const sent = Buffer.from(hash("sha256", token));
    const stored = Buffer.from(storedHash);
    return sent.length === stored.length && timingSafeEqual(sent, stored);
}

export async function authorize(req: Request, passedRoles: Role[]) {
    const apiToken = req.headers.get("x-api-token");

    if (apiToken) {
        const storedHash = await getApiSecretHash();
        if (!storedHash) {
            throw new ServerError("api token configuration is missing", 500);
        }
        if (!matchesHash(apiToken, storedHash)) {
            throw new ServerError("invalid api token", 401);
        }

        return { type: "api-token" as const, role: "admin" as const };
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
        throw new ServerError("missing authorization header", 401);
    }
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        throw new ServerError("invalid authorization format", 401);
    }

    let decoded: Awaited<ReturnType<typeof verifyToken>>;
    try {
        decoded = await verifyToken(token);
    } catch (e) {
        // A missing/broken signing secret is a server fault (its own 500); a bad or expired token is a 401.
        if (e instanceof ServerError) throw e;
        throw new ServerError("invalid token", 401);
    }
    if (!passedRoles.includes(decoded.role)) {
        throw new ServerError("forbidden", 403);
    }
    return { type: "jwt" as const, decoded };
}

export type AuthIdentity = Awaited<ReturnType<typeof authorize>>;

// The static API token always acts as admin; a JWT carries its own role.
export function roleOf(auth: AuthIdentity): Role {
    return auth.type === "api-token" ? auth.role : auth.decoded.role;
}

// The API token has no person behind it.
export function userIdOrNull(auth: AuthIdentity): string | null {
    return auth.type === "jwt" ? auth.decoded.id : null;
}

// For per-person data, which the API token cannot own.
export function userIdOf(auth: AuthIdentity): string {
    const userId = userIdOrNull(auth);
    if (userId === null) {
        throw new ServerError("forbidden", 403);
    }
    return userId;
}

// Browser <video>/<img> can't send a bearer header, so media also accepts the JWT
// from an httpOnly cookie; every other route stays bearer-only.
export async function authorizeMedia(c: Context, roles: Role[]): Promise<AuthIdentity> {
    const cookieToken = getCookie(c, AUTH_COOKIE);
    if (cookieToken) {
        let decoded: Awaited<ReturnType<typeof verifyToken>>;
        try {
            decoded = await verifyToken(cookieToken);
        } catch (e) {
            if (e instanceof ServerError) throw e;
            throw new ServerError("invalid token", 401);
        }
        if (!roles.includes(decoded.role)) {
            throw new ServerError("forbidden", 403);
        }
        return { type: "jwt" as const, decoded };
    }
    return authorize(c.req.raw, roles);
}
