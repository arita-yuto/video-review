import { createRouter } from "@/server/lib/openapi/router";
import { loginRouter } from "@/server/routes/auth/login";
import { verifyRouter } from "@/server/routes/auth/verify";
import { logoutRouter } from "@/server/routes/auth/logout";
import { guestEnabledRouter } from "@/server/routes/auth/guest-enabled";
import { loginDefaultTypeRouter } from "@/server/routes/auth/login-default-type";

export const authRouter = createRouter()
    .route("/login", loginRouter)
    .route("/verify", verifyRouter)
    .route("/logout", logoutRouter)
    .route("/guest-enabled", guestEnabledRouter)
    .route("/login-default-type", loginDefaultTypeRouter);
