import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { decryptSecret, encryptSecret, ensureSecretKey } from "@/server/lib/secret-box";

let dir: string;
let keyFile: string;

describe("secret box", () => {
    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "secret-box-"));
        keyFile = path.join(dir, "secrets", "secret.key");
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it("reads back what it encrypted", () => {
        const stored = encryptSecret("jira-token-123", keyFile);

        expect(stored).not.toContain("jira-token-123");
        expect(decryptSecret(stored, keyFile)).toBe("jira-token-123");
    });

    it("keeps an existing key, so earlier secrets stay readable", () => {
        const stored = encryptSecret("jira-token-123", keyFile);
        const before = fs.readFileSync(keyFile, "utf8");

        ensureSecretKey(keyFile);

        expect(fs.readFileSync(keyFile, "utf8")).toBe(before);
        expect(decryptSecret(stored, keyFile)).toBe("jira-token-123");
    });

    it("refuses to decrypt without a key instead of creating a new one", () => {
        const stored = encryptSecret("jira-token-123", keyFile);
        fs.rmSync(keyFile);

        expect(() => decryptSecret(stored, keyFile)).toThrow("secret key file is missing");
        expect(fs.existsSync(keyFile)).toBe(false);
    });

    it("rejects a value whose tag was cut short", () => {
        // An empty secret has no body, so a cut-down prefix of its real tag is otherwise a valid value.
        const raw = Buffer.from(encryptSecret("", keyFile).slice("enc:v1:".length), "base64");
        const forged = "enc:v1:" + raw.subarray(0, raw.length - 12).toString("base64");

        expect(() => decryptSecret(forged, keyFile)).toThrow();
    });

    it.skipIf(process.platform === "win32")("creates the key readable by its owner only", () => {
        ensureSecretKey(keyFile);

        expect(fs.statSync(keyFile).mode & 0o777).toBe(0o600);
    });
});
