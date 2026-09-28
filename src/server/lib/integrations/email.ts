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
        // The test sends a whole mail, so a server that stalls after the greeting must not hold the admin either.
        socketTimeout: 10_000,
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
        // Where Test & save sends its mail; kept so the next test goes to the same place.
        testTo: { kind: "plain", env: () => undefined, schema: z.string().email() },
    },
    testSchema: TestResultSchema,
    // The test sends a mail, so it must not run just because the screen was opened.
    check: () => false,
    // Turning email off needs no server, so it saves even while the relay is down.
    canTest: ({ enable, host, port, from, testTo }) => enable !== "true" || (!!host && !!port && !!from && !!testTo),
    // A greeting proves nothing about delivery, so the test hands the server one real mail and the admin checks the inbox.
    test: async (config) => {
        if (config.enable !== "true") return { ok: true };

        try {
            await createTransport(config).sendMail({
                from: config.from,
                to: config.testTo,
                subject: "[VideoReview] Test mail",
                text: "Sent by Test & save on the admin screen. Comment notifications will arrive like this.",
            });
            return { ok: true };
        } catch (e) {
            return { ok: false, error: e instanceof Error ? e.message : "the SMTP server could not be reached" };
        }
    },
});

export const getEmailConfig = () => getConfig(email);
