import { prisma } from "@/server/lib/db";
import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import bcrypt from "bcrypt";
import { UserSchema } from "@/schema/zod";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { ServerError } from "@/server/lib/server-error";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-types";

const UpdateProfileBody = z.object({
    userId: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    pass: z.string().min(MIN_PASSWORD_LENGTH).optional(),
    currentPass: z.string().optional(),
});

export const userRouter = createRouter()
    .openapi(createRoute({
        method: "patch",
        summary: "Update Profile",
        path: "/update",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: UpdateProfileBody,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Profile update successfully",
                content: {
                    "application/json": {
                        schema: UserSchema,
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            410: errorResponse("invalid userid"),
        },
    }), async (c) => {
        // Guests are excluded: only a signed-in viewer/admin may edit a profile.
        // A failure throws to app.onError, like the other guarded routes.
        const auth = await authorize(c.req.raw, ["viewer", "admin"]);

        const body = c.req.valid("json");
        const {
            userId,
            email,
            pass,
            currentPass,
            displayName,
        } = body;

        // A profile can only be edited by its owner. An api-token caller carries no
        // user id, so it can never be the owner and is refused as well.
        const callerId = auth.type === "jwt" ? auth.decoded.id : undefined;
        if (!userId || !callerId || userId !== callerId) {
            return c.json({ error: "forbidden" }, 403);
        }

        const updated = await prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id: userId },
                data: {
                    ...(email ? { email } : {}),
                    ...(displayName ? { displayName } : {}),
                },
            });

            if (pass) {
                // Re-authenticate with the current password before rotating it,
                // so an unattended session cannot change the password.
                const identity = await tx.identity.findFirst({
                    where: { userId, provider: "password" },
                });
                if (!identity?.secretHash || !currentPass || !(await bcrypt.compare(currentPass, identity.secretHash))) {
                    throw new ServerError("current password is incorrect", 403);
                }

                await tx.identity.update({
                    where: { id: identity.id },
                    data: {
                        ...(email ? { providerUid: email } : {}),
                        secretHash: await bcrypt.hash(pass, 10),
                    },
                });
            }

            return user;
        });
        return c.json(updated, 200);
    });
