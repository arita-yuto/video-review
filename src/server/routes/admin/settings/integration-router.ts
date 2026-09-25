import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { type Fields, type IntegrationDef, TestResultSchema } from "@/server/lib/integrations/define";
import { checkConnection, describeConfig, resetConnection, testAndSave, updateConfig, type FieldState } from "@/server/lib/integrations/store";

const SourceSchema = z.enum(["saved", "env"]).nullable();
const PlainStateSchema = z.object({ kind: z.enum(["plain", "destination"]), value: z.string().nullable(), source: SourceSchema });
const SecretStateSchema = z.object({ kind: z.literal("secret"), configured: z.boolean(), source: SourceSchema });

export function integrationRouter<F extends Fields, R extends typeof TestResultSchema>(def: IntegrationDef<F, R>) {
    const fields = Object.entries(def.fields);

    const StateSchema = z.object(Object.fromEntries(fields.map(([field, spec]) =>
        [field, spec.kind === "secret" ? SecretStateSchema : PlainStateSchema])));

    const UpdateSchema = z.object(Object.fromEntries(fields.map(([field, spec]) =>
        [field, (spec.kind === "secret" ? z.string().min(1) : (spec.schema ?? z.string().min(1))).optional()])));

    const errors = {
        401: errorResponse("Unauthorized"),
        403: errorResponse("Forbidden"),
        500: errorResponse("A saved secret could not be read"),
    };

    // The field names are only known at runtime here, so the state is typed as a plain record.
    const state = async () => (await describeConfig(def)) as Record<string, FieldState>;

    const stateResponse = (description: string) => ({
        description,
        content: { "application/json": { schema: StateSchema } },
    });

    return createRouter()
        .openapi(createRoute({
            method: "get",
            summary: `${def.name} settings`,
            path: "/",
            responses: { 200: stateResponse("Settings, with secrets shown only as set or not"), ...errors },
        }), async (c) => {
            await authorize(c.req.raw, ["admin"]);

            return c.json(await state(), 200);
        })
        .openapi(createRoute({
            method: "put",
            summary: `update ${def.name} settings`,
            path: "/",
            request: { body: { content: { "application/json": { schema: UpdateSchema } } } },
            responses: {
                200: stateResponse("Settings after the update"),
                400: errorResponse("Invalid parameters"),
                ...errors,
            },
        }), async (c) => {
            await authorize(c.req.raw, ["admin"]);

            await updateConfig(def, c.req.valid("json") as Partial<Record<keyof F, string>>);

            return c.json(await state(), 200);
        })
        .openapi(createRoute({
            method: "delete",
            summary: `reset the ${def.name} connection`,
            path: "/",
            responses: { 200: stateResponse("Settings after the saved secrets were dropped; everything else stays"), ...errors },
        }), async (c) => {
            await authorize(c.req.raw, ["admin"]);

            await resetConnection(def);

            return c.json(await state(), 200);
        })
        .openapi(createRoute({
            method: "post",
            summary: `test and save ${def.name} settings`,
            path: "/test-and-save",
            request: { body: { content: { "application/json": { schema: UpdateSchema } } } },
            responses: {
                200: {
                    description: "The test result, and the settings as saved: unchanged when the test failed",
                    content: {
                        "application/json": {
                            // Typed as the shared shape; the spec still shows each integration's own fields.
                            schema: z.object({ result: def.testSchema as typeof TestResultSchema, state: StateSchema }),
                        },
                    },
                },
                400: errorResponse("Invalid parameters"),
                ...errors,
            },
        }), async (c) => {
            await authorize(c.req.raw, ["admin"]);

            const result = (await testAndSave(def, c.req.valid("json") as Partial<Record<keyof F, string>>)) as z.infer<typeof TestResultSchema>;

            return c.json({ result, state: await state() }, 200);
        })
        .openapi(createRoute({
            method: "get",
            summary: `whether the saved ${def.name} connection works`,
            path: "/status",
            responses: {
                200: {
                    description: "Configured and reachable, from the saved or env values",
                    content: { "application/json": { schema: z.object({ configured: z.boolean(), ok: z.boolean() }) } },
                },
                ...errors,
            },
        }), async (c) => {
            await authorize(c.req.raw, ["admin"]);

            return c.json(await checkConnection(def), 200);
        });
}
