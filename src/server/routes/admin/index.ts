import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { maintenanceRouter } from "@/server/routes/admin/maintenance";
import { settingsRouter } from "@/server/routes/admin/settings";
import { createVCSProviderFromEnv } from "@/server/lib/vcs/from-env";
import { listUTCDays, upsertMerge, upsertCommit } from "@/server/lib/vcs/cache";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { ASSIGNABLE_ROLES } from "@/lib/role";
import bcrypt from "bcrypt";
import { hash, randomBytes } from "crypto";

const CreateAdminBody = z.object({
    email: z.string().optional(),
    pass: z.string().min(6).optional(),
});

const CreateUserBody = z.object({
    displayName: z.string().optional(),
    email: z.string().optional(),
    pass: z.string().min(6).optional(),
});

const UpdateRoleBody = z.object({
    userId: z.string().optional(),
    role: z.enum(ASSIGNABLE_ROLES).optional(),
});

const UserListResponse = z.object({
    users: z.array(z.object({
        id: z.string(),
        email: z.string().nullable(),
        displayName: z.string(),
        role: z.string(),
        avatarPath: z.string().nullable(),
        createdAt: z.string(),
    })),
});

const WarmCacheBody = z.object({
    from: z.iso.datetime({ message: "from must be an ISO 8601 datetime string" }),
    to: z.iso.datetime({ message: "to must be an ISO 8601 datetime string" }),
    refresh: z.boolean().optional(),
});

export const adminRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "boostrap",
        path: "/bootstrap",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: CreateAdminBody,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "admin user created successfully",
                content: {
                    "application/json": {
                        schema: z.object({ success: z.boolean() }),
                    },
                },
            },
            400: errorResponse("Invalid parameters"),
            410: errorResponse("admin user already exists"),
        },
    }), async (c) => {
        const body = c.req.valid("json");
        const {
            email,
            pass,
        } = body;

        if (await prisma.user.count() > 0) {
            return c.json({ error: "Already initialized" }, 410);
        }

        if (!email || !pass) {
            return c.json({ error: "email, pass, role are required" }, 400);
        }

        const exists = await prisma.systemSecret.findUnique({
            where: { key: "JWT_SECRET" },
        });

        if (exists) {
            return c.json({ error: "Already initialized" }, 410);
        }

        const jwtSecret = randomBytes(64).toString("hex");
        await prisma.systemSecret.create({
            data: {
                key: "JWT_SECRET",
                valueHash: hash("sha256", jwtSecret),
            },
        });

        await prisma.user.create({
            data: {
                email,
                displayName: "admin",
                role: "admin",
                identities: {
                    create: {
                        provider: "password",
                        providerUid: email,
                        secretHash: await bcrypt.hash(pass, 10),
                    },
                },
            },
        });
        return c.json({ success: true }, 200);
    })
    .openapi(createRoute({
        method: "post",
        summary: "Create user(only viewer)",
        description: "Creates a new user.",
        path: "/create-user",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: CreateUserBody,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "user created successfully",
            },
            400: {
                description: "Invalid parameters",
            },
            403: {
                description: "Forbidden",
            },
            410: {
                description: "User already exists",
            },
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "unauthorized" }, { status: 401 });
        }

        const body = c.req.valid("json");
        const {
            email,
            pass,
            displayName,
        } = body;

        if (!email || !pass) {
            return c.json({ error: "email, pass, role are required" }, 400);
        }

        let name = displayName ? displayName : "User"

        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) {
            return c.json({ error: "User already exists. Skip." }, 410);
        }

        const hash = await bcrypt.hash(pass, 10);
        await prisma.user.create({
            data: {
                email,
                displayName: name,
                role: "viewer",
                identities: {
                    create: {
                        provider: "password",
                        providerUid: email,
                        secretHash: hash,
                    },
                },
            },
        });
        return c.json({ success: true }, { status: 200 });
    })
    .openapi(createRoute({
        method: "patch",
        summary: "Update role",
        path: "/role-update",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: UpdateRoleBody,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Role update successfully",
            },
            400: {
                description: "Invalid parameters",
            },
            403: {
                description: "Forbidden",
            },
            410: {
                description: "invalid userid",
            },
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "unauthorized" }, { status: 401 });
        }

        const body = c.req.valid("json");
        const { userId, role } = body;

        if (!userId) {
            return c.json({ error: "userId is required" }, 400);
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: { role },
        });
        return c.json(updated, { status: 200 });
    })
    .openapi(createRoute({
        method: "get",
        summary: "List users",
        description: "Lists every user for the admin dialog. Unpaginated: self-hosted teams are small.",
        path: "/users",
        responses: {
            200: {
                description: "Users ordered by creation time",
                content: {
                    "application/json": {
                        schema: UserListResponse,
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as 401 | 403);
            }
            return c.json({ error: "unauthorized" }, 401);
        }

        // The row itself holds no secret: those live on Identity, which is not included here.
        const users = await prisma.user.findMany({
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
        return c.json({
            users: users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })),
        }, 200);
    })
    .openapi(createRoute({
        method: "post",
        summary: "Pre-warm VCS cache for a date range",
        description: [
            "Fetches all PRs and commits in the given date range from the configured VCS provider",
            "and stores them in VCSCachedMerge / VCSCachedCommit.",
            "Intended for CI jobs to pre-populate the cache before users request vcs-changes.",
            "Already-cached records (filesFetchedAt IS NOT NULL) are skipped.",
        ].join(" "),
        path: "/vcs/warm-cache",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: WarmCacheBody,
                    },
                },
            },
        },
        responses: {
            200: { description: "Cache warmed successfully" },
            400: { description: "Invalid date range" },
            401: { description: "Unauthorized" },
            503: { description: "VCS provider not configured" },
        },
    }), async (c) => {
        try {
            await authorize(c.req.raw, ["admin"]);
        } catch (e) {
            if (e instanceof ServerError) {
                return c.json({ error: e.message }, e.status as ContentfulStatusCode);
            }
            return c.json({ error: "unauthorized" }, { status: 401 });
        }

        const { from: fromStr, to: toStr, refresh } = c.req.valid("json");
        const from = new Date(fromStr);
        const to = new Date(toStr);

        if (from >= to) {
            return c.json({ error: "from must be before to" }, { status: 400 });
        }

        let provider;
        try {
            provider = createVCSProviderFromEnv();
        } catch (err) {
            return c.json({ error: String(err) }, { status: 503 });
        }
        if (!provider) {
            return c.json({ error: "VCS provider is not configured" }, { status: 503 });
        }

        const repoName = provider.name;
        const days = listUTCDays(from, to);

        const alreadyFetched = refresh ? new Set<number>() : await prisma.vCSFetchedRange.findMany({
            where: { repoName, date: { in: days } },
            select: { date: true },
        }).then(rows => new Set(rows.map(r => r.date.getTime())));

        type DayResult = { day: string; fetched: number; skipped: number; failed: number; errors: string[] };

        const dayResults = await Promise.allSettled(
            days.map(async (day): Promise<DayResult> => {
                if (alreadyFetched.has(day.getTime())) {
                    return { day: day.toISOString(), fetched: 0, skipped: 1, failed: 0, errors: [] };
                }

                const dayEnd = new Date(day.getTime() + 86_400_000);
                let changeSet;
                try {
                    changeSet = await provider.getChanges({ from: day, to: dayEnd });
                } catch (err) {
                    return { day: day.toISOString(), fetched: 0, skipped: 0, failed: 1, errors: [String(err)] };
                }

                const settled = await Promise.allSettled([
                    ...changeSet.pullRequests.map(pr => upsertMerge(provider, repoName, pr)),
                    ...changeSet.commits.map(commit => upsertCommit(provider, repoName, commit)),
                ]);

                const errors = settled
                    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
                    .map(r => String(r.reason));

                if (errors.length === 0) {
                    await prisma.vCSFetchedRange.upsert({
                        where: { repoName_date: { repoName, date: day } },
                        create: { repoName, date: day },
                        update: { fetchedAt: new Date() },
                    });
                }

                return {
                    day: day.toISOString(),
                    fetched: settled.filter(r => r.status === "fulfilled").length,
                    skipped: 0,
                    failed: errors.length,
                    errors,
                };
            })
        );

        const succeeded = dayResults
            .filter((r): r is PromiseFulfilledResult<DayResult> => r.status === "fulfilled")
            .map(r => r.value);
        const failed = dayResults
            .filter((r): r is PromiseRejectedResult => r.status === "rejected")
            .map(r => ({ day: "unknown", errors: [String(r.reason)] }));
        const allErrors = [
            ...succeeded.flatMap(d => d.errors.map(e => `${d.day}: ${e}`)),
            ...failed.map(d => d.errors[0]),
        ];

        return c.json({
            days: {
                total: days.length,
                fetched: succeeded.filter(d => d.failed === 0 && d.skipped === 0).length,
                skipped: succeeded.filter(d => d.skipped === 1).length,
                failed: succeeded.filter(d => d.failed > 0).length + failed.length,
                ...(allErrors.length > 0 ? { errors: allErrors } : {}),
            },
            range: { from: from.toISOString(), to: to.toISOString() },
        });
    })
    .route("/maintenance", maintenanceRouter)
    .route("/settings", settingsRouter);
