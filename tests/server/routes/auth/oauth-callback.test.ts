import { beforeEach, describe, expect, it, vi } from "vitest";

// The sign-in itself is a mock; what is checked is how the callback answers the browser for each thing it returns.
const oauthMock = vi.hoisted(() => ({
    oauthProviderNames: ["jira"],
    finishOAuthLogin: vi.fn(),
}));

vi.mock("@/server/lib/login/oauth", () => oauthMock);

import { oauthRouter } from "@/server/routes/auth/oauth";
import { ServerError } from "@/server/lib/server-error";

const STATE = "a".repeat(64);

function callback(query: Record<string, string>, cookieState = STATE) {
    const url = new URL("http://localhost/jira/callback");
    url.search = new URLSearchParams(query).toString();
    return oauthRouter.request(url, { headers: { cookie: `video_review_oauth_state=${cookieState}` } });
}

describe("GET /auth/oauth/jira/callback", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // The route logs the cause of a failed sign-in; keep it out of the test output.
        vi.spyOn(console, "error").mockImplementation(() => {});
        oauthMock.finishOAuthLogin.mockResolvedValue({ token: "jwt", id: "user-1", role: "viewer", displayName: "Hitori", provider: "jira" });
    });

    it("does not log in when the state is not the one this browser was sent with", async () => {
        const res = await callback({ code: "good-code", state: "b".repeat(64) });

        expect(res.status).toBe(302);
        expect(res.headers.get("location")).toBe("/login?error=failed");
        expect(oauthMock.finishOAuthLogin).not.toHaveBeenCalled();
    });

    it("sends a disabled user back with the disabled error", async () => {
        oauthMock.finishOAuthLogin.mockRejectedValue(new ServerError("user disabled", 403));

        const res = await callback({ code: "good-code", state: STATE });

        expect(res.headers.get("location")).toBe("/login?error=disabled");
    });

    it("sets the auth cookie and hands over to the login screen when the state matches", async () => {
        const res = await callback({ code: "good-code", state: STATE });

        expect(oauthMock.finishOAuthLogin).toHaveBeenCalledWith("jira", expect.objectContaining({ code: "good-code" }));
        expect(res.headers.get("set-cookie")).toContain("video_review_token=jwt");
        expect(res.headers.get("location")).toBe("/login?session=1");
    });
});
