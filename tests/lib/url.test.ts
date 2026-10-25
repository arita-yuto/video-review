import { describe, expect, it } from "vitest";
import { parseLoginReturnUrl } from "@/lib/url";

const search = (returnUrl: string) => `?returnUrl=${encodeURIComponent(returnUrl)}`;

describe("login return URL", () => {
    it("goes back to the page of this app that sent the viewer to the login", () => {
        expect(parseLoginReturnUrl(search("/video-review/review/abc?join=1"))).toBe("/video-review/review/abc?join=1");
    });

    it("falls back to the list for anything that would leave the site", () => {
        expect(parseLoginReturnUrl(search("//evil.com"))).toBe("/video-review/review");
        expect(parseLoginReturnUrl(search("/\\evil.com"))).toBe("/video-review/review");
        expect(parseLoginReturnUrl(search("https://evil.com"))).toBe("/video-review/review");
    });
});
