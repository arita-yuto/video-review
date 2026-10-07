import { createRoute, z } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { writeCsv } from "@/server/lib/csv-import";

export const usersExportRouter = createRouter()
    .openapi(createRoute({
        method: "get",
        summary: "Export users as CSV",
        description: "Lists the users who sign in with a password, in the columns the import reads. The pass column is always empty.",
        path: "/",
        responses: {
            200: {
                description: "UTF-8 CSV with a BOM",
                content: {
                    "text/csv": {
                        schema: z.string(),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);

        const users = await prisma.user.findMany({
            where: { identities: { some: { provider: "password" } } },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });

        const csv = writeCsv(
            ["id", "name", "email", "pass", "role", "active"],
            users.map(u => [u.id, u.displayName, u.email ?? "", "", u.role, String(u.active)]),
        );
        return c.body(csv, 200, {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=\"users.csv\"",
        });
    });
