import { createRoute, z } from "@hono/zod-openapi";
import bcrypt from "bcrypt";
import { prisma } from "@/server/lib/db";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { CSV_ERROR_CODES, csvValues, defineCsv, readCsv, validateCsv, type CsvError } from "@/server/lib/csv-import";
import { ASSIGNABLE_ROLES } from "@/lib/role";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-types";

const userCsv = defineCsv({
    id: { schema: z.string(), unique: true },
    name: { schema: z.string(), required: true },
    email: { schema: z.email(), unique: true },
    pass: { schema: z.string().min(MIN_PASSWORD_LENGTH), trim: false },
    role: { schema: z.enum(ASSIGNABLE_ROLES) },
    active: { schema: z.enum(["true", "false"]) },
});

const USER_ERROR_CODES = ["unknownId", "selfChange", "emailTaken"] as const;

type ImportError = CsvError<typeof CSV_ERROR_CODES[number] | typeof USER_ERROR_CODES[number]>;

const ImportBody = z.object({
    csv: z.string(),
});

const ImportErrorsResponse = z.object({
    errors: z.array(z.object({
        line: z.number().nullable(),
        column: z.string().nullable(),
        code: z.enum([...CSV_ERROR_CODES, ...USER_ERROR_CODES]),
        params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    })),
});

export const usersImportRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Create and update users from a CSV file",
        description: [
            "A row with an id updates that user and an empty cell keeps its value; a row without one creates a user.",
            "Applies every row or none. On a problem, lists each one with its row (the header is row 1), column and reason.",
        ].join(" "),
        path: "/",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: ImportBody,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Every row was applied; updated counts only the users that changed",
                content: {
                    "application/json": {
                        schema: z.object({ created: z.number(), updated: z.number() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            422: {
                description: "Nothing was changed",
                content: {
                    "application/json": {
                        schema: ImportErrorsResponse,
                    },
                },
            },
        },
    }), async (c) => {
        const auth = await authorize(c.req.raw, ["admin"]);
        const selfId = auth.type === "jwt" ? auth.decoded.id : undefined;
        const { csv } = c.req.valid("json");

        const { records, errors: readErrors } = readCsv(userCsv, csv);
        const errors: ImportError[] = [...readErrors, ...validateCsv(userCsv, records)];

        // Only password users are exported, so an id of anyone else reads as unknown.
        const existing = await prisma.user.findMany({
            where: {
                id: { in: records.map(r => r.cells.id).filter(id => id !== "") },
                identities: { some: { provider: "password" } },
            },
        });
        const existingById = new Map(existing.map(u => [u.id, u]));

        for (const { line, cells } of records) {
            if (cells.id === "") {
                if (cells.email === "") errors.push({ line, column: "email", code: "required" });
                if (cells.pass === "") errors.push({ line, column: "pass", code: "required" });
                continue;
            }

            const user = existingById.get(cells.id);
            if (!user) {
                errors.push({ line, column: "id", code: "unknownId" });
                continue;
            }

            // The same guards as the Users tab: an admin cannot demote, disable or reset themselves here.
            if (user.id === selfId) {
                if (cells.role !== "" && cells.role !== user.role) errors.push({ line, column: "role", code: "selfChange" });
                if (cells.active !== "" && cells.active !== String(user.active)) errors.push({ line, column: "active", code: "selfChange" });
                if (cells.pass !== "") errors.push({ line, column: "pass", code: "selfChange" });
            }
        }

        const holders = await prisma.user.findMany({
            where: { email: { in: records.map(r => r.cells.email).filter(email => email !== "") } },
            select: { id: true, email: true },
        });
        const holderByEmail = new Map(holders.map(u => [u.email, u.id]));
        for (const { line, cells } of records) {
            const holder = holderByEmail.get(cells.email);
            if (holder !== undefined && holder !== cells.id) errors.push({ line, column: "email", code: "emailTaken" });
        }

        if (errors.length > 0) {
            errors.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
            return c.json({ errors }, 422);
        }

        const rows = await Promise.all(records.map(async record => {
            const row = csvValues(userCsv, record);
            return { ...row, hash: row.pass === undefined ? undefined : await bcrypt.hash(row.pass, 10) };
        }));

        const creates = rows.filter(row => !row.id);

        const updates = rows
            .filter(row => row.id)
            .map(row => {
                const user = existingById.get(row.id!)!;
                return {
                    user,
                    hash: row.hash,
                    next: {
                        displayName: row.name,
                        email: row.email ?? user.email,
                        role: row.role ?? user.role,
                        active: row.active === undefined ? user.active : row.active === "true",
                    },
                };
            })
            .filter(({ user, hash, next }) => hash !== undefined
                || next.displayName !== user.displayName
                || next.email !== user.email
                || next.role !== user.role
                || next.active !== user.active);

        await prisma.$transaction(async (tx) => {
            for (const row of creates) {
                await tx.user.create({
                    data: {
                        email: row.email,
                        displayName: row.name,
                        role: row.role ?? "viewer",
                        active: row.active !== "false",
                        identities: {
                            create: {
                                provider: "password",
                                providerUid: row.email!,
                                secretHash: row.hash,
                            },
                        },
                    },
                });
            }

            for (const { user, hash, next } of updates) {
                await tx.user.update({ where: { id: user.id }, data: next });

                // The password login finds the user by this copy of the email.
                if (next.email !== user.email) {
                    await tx.identity.updateMany({
                        where: { userId: user.id, provider: "password" },
                        data: { providerUid: next.email! },
                    });
                }

                if (hash !== undefined) {
                    await tx.identity.updateMany({
                        where: { userId: user.id, provider: "password" },
                        data: { secretHash: hash },
                    });
                }
            }
        });

        return c.json({ created: creates.length, updated: updates.length }, 200);
    });
