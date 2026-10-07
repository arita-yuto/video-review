import { createRoute, z } from "@hono/zod-openapi";
import bcrypt from "bcrypt";
import { prisma } from "@/server/lib/db";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { CSV_ERROR_CODES, csvValues, defineCsv, readCsv, validateCsv, type CsvError } from "@/server/lib/csv-import";
import { ASSIGNABLE_ROLES } from "@/lib/role";

const userCsv = defineCsv({
    // Accepted as a column but must stay empty: the import only creates users.
    id: { schema: z.string() },
    name: { schema: z.string(), required: true, unique: true },
    email: { schema: z.email(), required: true, unique: true },
    pass: { schema: z.string().min(6), required: true, trim: false },
    role: { schema: z.enum(ASSIGNABLE_ROLES), default: "viewer" },
});

const USER_ERROR_CODES = ["idReadOnly", "emailTaken"] as const;

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
        summary: "Create users from a CSV file",
        description: "Creates every row or none. On a problem, lists each one with its row (the header is row 1), column and reason.",
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
                description: "Every row was created",
                content: {
                    "application/json": {
                        schema: z.object({ created: z.number() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            422: {
                description: "Nothing was created",
                content: {
                    "application/json": {
                        schema: ImportErrorsResponse,
                    },
                },
            },
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);
        const { csv } = c.req.valid("json");

        const { records, errors: readErrors } = readCsv(userCsv, csv);
        const errors: ImportError[] = [...readErrors, ...validateCsv(userCsv, records)];

        for (const { line, cells } of records) {
            if (cells.id !== "") errors.push({ line, column: "id", code: "idReadOnly" });
        }

        const taken = await prisma.user.findMany({
            where: { email: { in: records.map(r => r.cells.email).filter(email => email !== "") } },
            select: { email: true },
        });
        const takenEmails = new Set(taken.map(u => u.email));
        for (const { line, cells } of records) {
            if (takenEmails.has(cells.email)) errors.push({ line, column: "email", code: "emailTaken" });
        }

        if (errors.length > 0) {
            errors.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
            return c.json({ errors }, 422);
        }

        const users = records.map(record => csvValues(userCsv, record));
        const hashes = await Promise.all(users.map(u => bcrypt.hash(u.pass, 10)));
        await prisma.$transaction(users.map((u, i) => prisma.user.create({
            data: {
                email: u.email,
                displayName: u.name,
                role: u.role,
                identities: {
                    create: {
                        provider: "password",
                        providerUid: u.email,
                        secretHash: hashes[i],
                    },
                },
            },
        })));

        return c.json({ created: users.length }, 200);
    });
