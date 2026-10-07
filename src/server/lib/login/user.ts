import { signToken } from "@/server/lib/token";
import bcrypt from "bcrypt";
import { LoginRequest, LoginResponse } from "@/lib/auth-types"
import { prisma } from "@/server/lib/db";
import { Role } from "@/lib/role";
import { ServerError } from "@/server/lib/server-error";

export async function loginUser(c: LoginRequest): Promise<LoginResponse> {
    const identity = await prisma.identity.findUnique({
        where: {
            provider_providerUid: {
                provider: "password",
                providerUid: c.email,
            }
        },
        include: {
            user: true,
        }
    });

    if (!identity || !identity.secretHash) {
        throw new ServerError("user not found", 401);
    }

    const isPasswordValid = await bcrypt.compare(c.password, identity.secretHash);
    if (!isPasswordValid) {
        throw new ServerError("invalid password", 401);
    }

    if (!identity.user.active) {
        throw new ServerError("user disabled", 403);
    }

    let tokenPayload: Record<string, any> = {
        id: identity.user.id, displayName: identity.user.displayName, role: identity.user.role, provider: "password"
    };

    let token: string | undefined = undefined;
    try{
        token = await signToken(tokenPayload);
    } catch(e){
        throw e;
    }
    
    return {
        token,
        role: identity.user.role as Role,
        email: c.email,
        displayName: identity.user.displayName,
        id: identity.user.id,
        provider: "password",
    }
};