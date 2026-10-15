import { signToken } from "@/server/lib/token";
import { prisma } from "@/server/lib/db";
import { Role } from "@/lib/role";
import { LoginRequest, LoginResponse } from "@/lib/auth-types"
import { ServerError } from "@/server/lib/server-error";
import { getJiraConfig } from "@/server/lib/integrations/jira";

// What Jira reports about an account (/rest/api/2/myself or user search).
export type JiraUser = {
    key: string;
    emailAddress: string;
    displayName: string;
};

export async function loginWithJira(c: LoginRequest): Promise<LoginResponse> {
    const jiraUser = await findJiraUserByEmail(c.email);
    return loginJiraUser(jiraUser);
}

// The Jira key is looked up first so a changed email keeps the same VideoReview user; email only matches the first time.
export async function loginJiraUser(jiraUser: JiraUser): Promise<LoginResponse> {
    const existing = await findUser(jiraUser);
    if (existing && !existing.active) {
        throw new ServerError("user disabled", 403);
    }

    const user = existing
        ? await prisma.user.update({ where: { id: existing.id }, data: { displayName: jiraUser.displayName } })
        : await prisma.user.create({ data: { email: jiraUser.emailAddress, displayName: jiraUser.displayName } });

    await prisma.identity.upsert({
        where: { provider_providerUid: { provider: "jira", providerUid: jiraUser.key } },
        update: { userId: user.id },
        create: { userId: user.id, provider: "jira", providerUid: jiraUser.key },
    });

    const role = user.role as Role;
    const token = await signToken({ id: user.id, displayName: user.displayName, role, provider: "jira" });

    return {
        token,
        role,
        email: user.email ?? undefined,
        displayName: user.displayName,
        id: user.id,
        provider: "jira",
    };
}

async function findUser(jiraUser: JiraUser) {
    const identity = await prisma.identity.findUnique({
        where: { provider_providerUid: { provider: "jira", providerUid: jiraUser.key } },
        include: { user: true },
    });
    if (identity) {
        return identity.user;
    }
    return prisma.user.findUnique({ where: { email: jiraUser.emailAddress } });
}

async function findJiraUserByEmail(email: string): Promise<JiraUser> {
    const { baseUrl: base, token } = await getJiraConfig();
    if (!base || !token) {
        throw new ServerError("jira is not configured", 401);
    }

    const res = await fetch(`${base}/rest/api/2/user/search?username=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
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
        key: user.key,
        emailAddress: email,
        displayName: user.displayName || email,
    };
}
