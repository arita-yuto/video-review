import "server-only";
import nodemailer from "nodemailer";
import { z } from "@hono/zod-openapi";
import { env } from "@/server/lib/env";
import { defineIntegration, TestResultSchema } from "@/server/lib/integrations/define";
import { getConfig } from "@/server/lib/integrations/store";

const BooleanSchema = z.enum(["true", "false"]);

export function createTransport({ host, port, tlsStrict }: { host?: string; port?: string; tlsStrict?: string }) {
    return nodemailer.createTransport({
        host,
        port: Number(port),
        secure: false,
        tls: { rejectUnauthorized: tlsStrict === "true" },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
    });
}

// An internal SMTP relay: no credentials, so nothing here is a secret.
export const email = defineIntegration({
    name: "email",
    fields: {
        enable: { kind: "plain", env: () => env.EMAIL_ENABLE ? "true" : undefined, schema: BooleanSchema },
        host: { kind: "plain", env: () => env.SMTP_HOST },
        port: { kind: "plain", env: () => env.SMTP_PORT, schema: z.string().regex(/^\d+$/) },
        from: { kind: "plain", env: () => env.EMAIL_FROM },
        tlsStrict: { kind: "plain", env: () => env.SMTP_TLS_STRICT ? "true" : undefined, schema: BooleanSchema },
    },
    testSchema: TestResultSchema,
    // verify() only connects and greets the server; it sends no mail. While email is off there is no connection to show.
    check: ({ enable }) => enable === "true",
    // Turning email off needs no server, so it saves even while the relay is down.
    canTest: ({ enable, host, port, from }) => enable !== "true" || (!!host && !!port && !!from),
    test: async (config) => {
        if (config.enable !== "true") return { ok: true };

        try {
            await createTransport(config).verify();
            return { ok: true };
        } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : "the SMTP server could not be reached" };
        }
    },
});

export const getEmailConfig = () => getConfig(email);
