import { z } from "@hono/zod-openapi";
import { signToken } from "@/server/lib/token";
import { prisma } from "@/server/lib/db";
import { Role } from "@/lib/role";
import { LoginResponse } from "@/lib/auth-types";
import { ServerError } from "@/server/lib/server-error";
import { getJiraConfig } from "@/server/lib/integrations/jira";

// What Jira reports about an account (/rest/api/2/myself).
export const MyselfSchema = z.object({ key: z.string(), emailAddress: z.string(), displayName: z.string() });
export type JiraUser = z.infer<typeof MyselfSchema>;

// The secret is a password (sent as Basic) or a personal access token (sent as Bearer); Jira says which by
// answering /myself. Neither is kept.
export async function loginWithJira(email: string, secret: string): Promise<LoginResponse> {
    const { baseUrl } = await getJiraConfig();
    if (!baseUrl) {
        throw new ServerError("jira is not configured", 401);
    }

    let res = await askMyself(baseUrl, `Bearer ${secret}`);
    if (res.status === 401) {
        res = await askMyself(baseUrl, `Basic ${Buffer.from(`${email}:${secret}`).toString("base64")}`);
    }
    if (res.status === 403 && res.headers.get("x-authentication-denied-reason")?.includes("CAPTCHA_CHALLENGE")) {
        throw new ServerError("captcha", 403);
    }
    if (!res.ok) {
        throw new ServerError("jira did not accept the email and secret", 401);
    }

    const jiraUser = MyselfSchema.parse(await res.json());
    // A token identifies its owner on its own, so the typed email must be that owner's.
    if (jiraUser.emailAddress.toLowerCase() !== email.toLowerCase()) {
        throw new ServerError("jira did not accept the email and secret", 401);
    }
    return loginJiraUser(jiraUser);
}

function askMyself(baseUrl: string, authorization: string) {
    return fetch(`${baseUrl}/rest/api/2/myself`, {
        headers: { Authorization: authorization, Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
    });
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
