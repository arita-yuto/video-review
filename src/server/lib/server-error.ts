import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class ServerError extends Error {
    status: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.status = statusCode;
        this.message = message;
    }
}

export const handleServerError = (err: Error, c: Context) => {
    const status = err instanceof ServerError ? err.status : 500;

    if (status >= 500) {
        console.error(`${c.req.method} ${c.req.path} failed:`, err);
    }

    // ServerError messages are written for the client; any other error may carry internals and stays in the log.
    const message = err instanceof ServerError ? err.message : "internal error";
    return c.json({ error: message }, status as ContentfulStatusCode);
};
