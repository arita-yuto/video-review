import { describe, expect, it } from "vitest";
import { isNewerVersion } from "@/server/lib/latest-release";

describe("isNewerVersion", () => {
    it("is true only when the latest release is ahead of the running one", () => {
        expect(isNewerVersion("v0.14.0", "v0.13.0")).toBe(true);
        expect(isNewerVersion("v0.13.0", "v0.13.0")).toBe(false);
        expect(isNewerVersion("v0.12.9", "v0.13.0")).toBe(false);
    });

    it("never offers a release to a dev build", () => {
        expect(isNewerVersion("v0.14.0", "dev")).toBe(false);
    });
});
