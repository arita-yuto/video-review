import { describe, expect, it } from "vitest";
import { isNewerVersion } from "@/server/lib/latest-release";

describe("isNewerVersion", () => {
    it("is true only when the latest release is ahead of the running one", () => {
        expect(isNewerVersion("v0.14.0", "v0.13.0")).toBe(true);
        expect(isNewerVersion("v0.13.0", "v0.13.0")).toBe(false);
        expect(isNewerVersion("v0.12.9", "v0.13.0")).toBe(false);
    });

    it("orders release candidates by number and before their release, as video-review-cli upgrade does", () => {
        expect(isNewerVersion("v0.14.0-rc.10", "v0.14.0-rc.9")).toBe(true);
        expect(isNewerVersion("v0.14.0", "v0.14.0-rc.10")).toBe(true);
    });

    it("never offers a release to a dev build", () => {
        expect(isNewerVersion("v0.14.0", "dev")).toBe(false);
    });
});
