import "server-only";
import { z } from "@hono/zod-openapi";

// plain: read and written freely.
// destination: decides where the secrets are sent; it never goes with an env secret once saved.
// secret: encrypted at rest and never returned, not even its length.
export type FieldKind = "plain" | "destination" | "secret";

export type FieldDef = {
    kind: FieldKind;
    // Read on each use rather than at import, so it always reflects the current env.
    env: () => string | undefined;
    schema?: z.ZodType<string>;
};

export type Fields = Record<string, FieldDef>;

export type ConfigOf<F extends Fields> = { [K in keyof F]: string | undefined };

export const TestResultSchema = z.object({
    ok: z.boolean(),
    error: z.string().optional(),
});

export type IntegrationDef<F extends Fields, R extends typeof TestResultSchema> = {
    name: string;
    fields: F;
    testSchema: R;
    // Like CanExecute: whether test has what it needs. Pure and local, so the UI may call it freely.
    canTest: (config: ConfigOf<F>) => boolean;
    // Like Execute: connects with the values; only called once canTest passes.
    test: (config: ConfigOf<F>) => Promise<z.infer<R>>;
};

export function defineIntegration<F extends Fields, R extends typeof TestResultSchema>(def: IntegrationDef<F, R>) {
    return def;
}

export const HttpUrlSchema = z.string().url()
    .refine(url => /^https?:\/\//.test(url), "must be an http or https URL")
    // Calls join the base URL with a path, so a trailing slash would double up.
    .transform(url => url.replace(/\/+$/, ""));
