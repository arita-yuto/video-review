import { createRoute, z } from "@hono/zod-openapi";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { type Fields, type IntegrationDef, TestResultSchema } from "@/server/lib/integrations/define";
import { describeConfig, getConfig, resetConfig, updateConfig, type FieldState } from "@/server/lib/integrations/store";

const SourceSchema = z.enum(["saved", "env"]).nullable();
const PlainStateSchema = z.object({ value: z.string().nullable(), source: SourceSchema });
const SecretStateSchema = z.object({ configured: z.boolean(), source: SourceSchema });

export function integrationRouter<F extends Fields, R extends typeof TestResultSchema>(def: IntegrationDef<F, R>) {
    const fields = Object.entries(def.fields);
    const secrets = fields.filter(([, spec]) => spec.kind === "secret").map(([field]) => field);
    const destinations = fields.filter(([, spec]) => spec.kind === "destination").map(([field]) => field);

    const StateSchema = z.object(Object.fromEntries(fields.map(([field, spec]) =>
        [field, spec.kind === "secret" ? SecretStateSchema : PlainStateSchema])));

    const UpdateSchema = z.object(Object.fromEntries(fields.map(([field, spec]) => {
        const base = spec.kind === "secret" ? z.string().min(1) : (spec.schema ?? z.string().min(1));
        const described = spec.kind === "destination" && secrets.length > 0
            ? base.optional().openapi({ description: `Required together with ${secrets.join(", ")}` })
            : base.optional();
        return [field, described];
    }))).refine(
        body => !destinations.some(field => body[field] !== undefined) || secrets.every(field => body[field] !== undefined),
        { message: `enter ${secrets.join(", ")} again when changing where ${def.name} connects` },
    );

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
            summary: `reset ${def.name} settings`,
            path: "/",
            responses: { 200: stateResponse("Settings after every saved value was dropped"), ...errors },
        }), async (c) => {
            await authorize(c.req.raw, ["admin"]);

            await resetConfig(def);

            return c.json(await state(), 200);
        })
        .openapi(createRoute({
            method: "post",
            summary: `test the saved ${def.name} connection`,
            path: "/test",
            responses: {
                200: {
                    description: "Whether the saved settings work",
                    // Typed as the shared shape; the spec still shows each integration's own fields.
                    content: { "application/json": { schema: def.testSchema as typeof TestResultSchema } },
                },
                ...errors,
            },
        }), async (c) => {
            await authorize(c.req.raw, ["admin"]);

            return c.json(await def.test(await getConfig(def)), 200);
        });
}
