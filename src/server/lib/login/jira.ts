import { signToken } from "@/server/lib/token";
import { prisma } from "@/server/lib/db";
import { Role } from "@/lib/role";
import { LoginRequest, LoginResponse } from "@/lib/auth-types"
import { ServerError } from "@/server/lib/server-error";
import { getJiraConfig } from "@/server/lib/integrations/jira";

export async function loginWithJira(c: LoginRequest): Promise<LoginResponse> {
    let jiraInfo;
    try {
        jiraInfo = await authenticateWithJira(c.email);
    } catch(e) {
        throw e;
    }

    const userDB = await upsertUser(
        c.email,
        jiraInfo.displayName
    );

    await upsertJiraIdentity(
        userDB.id,
        jiraInfo.jira.userKey
    );

    const role: Role = 'viewer';
    let tokenPayload: Record<string, any> = {
        id: userDB.id, displayName: userDB.displayName, role, provider: "jira"
    };

    let token: string | undefined = undefined;
    try{
        token = await signToken(tokenPayload);
    } catch(e){
        throw e;
    }

    return {
        token,
        role,
        email: c.email,
        displayName: userDB.displayName,
        id: userDB.id,
        provider: "jira",
    }
}

async function authenticateWithJira(email: string) {
    const { baseUrl: base, token } = await getJiraConfig();
    if(!base || !token) {
        throw new ServerError("jira is not configured", 401);
    }

    const res = await fetch(`${base}/rest/api/2/user/search?username=${email}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
    });

    if (!res.ok) {
        throw new ServerError("Cannot get Jira info", 401);
    } 

    const users = await res.json();
    if (!users?.length) {
        throw new ServerError("User not found in Jira", 401);
    }

    const user = users[0];
    return {
        displayName: user.displayName || email,
        jira: {
            userKey: user.key,
        },
    };
}

async function upsertJiraIdentity(userId: string, accountId: string) {
    return prisma.identity.upsert({
        where: {
            provider_providerUid: {
                provider: 'jira',
                providerUid: accountId,
            }
        },
        update: { userId },
        create: {
            userId,
            provider: 'jira',
            providerUid: accountId,
        },
    });
}

async function upsertUser(email: string, displayName: string) {
    return prisma.user.upsert({
        where: { email },
        update: { displayName },
        create: { email, displayName },
    });
}
