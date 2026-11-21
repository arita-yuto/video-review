import { createRouter } from "@/server/lib/openapi/router";
import { resolverRouter } from "@/server/routes/media/resolver";
import { sizesRouter } from "@/server/routes/media/sizes";
import { localRouter } from "@/server/routes/media/local";
import { nextCloudRouter } from "@/server/routes/media/nextcloud";
import { downloadRouter } from "@/server/routes/media/download";

export const mediaRouter = createRouter()
    .route("/resolver", resolverRouter)
    .route("/sizes", sizesRouter)
    .route("/local", localRouter)
    .route("/nextcloud", nextCloudRouter)
    .route("/download", downloadRouter);
