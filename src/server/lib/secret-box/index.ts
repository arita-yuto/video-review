import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { ServerError } from "@/server/lib/server-error";

// The key lives outside the database, so a leaked dump or backup alone cannot decrypt the stored secrets.
export const SECRET_KEY_FILE = path.join(process.cwd(), "secrets", "secret.key");

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const PREFIX = "enc:v1:";

function parseKey(text: string) {
    const key = Buffer.from(text.trim(), "hex");
    if (key.length !== KEY_BYTES) {
        throw new ServerError("secret key file is malformed", 500);
    }
    return key;
}

// Only the write path may create the key: a key made while reading would orphan everything encrypted before it.
export function ensureSecretKey(keyFile = SECRET_KEY_FILE) {
    if (fs.existsSync(keyFile)) {
        return parseKey(fs.readFileSync(keyFile, "utf8"));
    }

    fs.mkdirSync(path.dirname(keyFile), { recursive: true, mode: 0o700 });
    const key = randomBytes(KEY_BYTES);
    try {
        // "wx" refuses to overwrite a key another process has just written.
        fs.writeFileSync(keyFile, key.toString("hex") + "\n", { flag: "wx", mode: 0o600 });
    } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        return parseKey(fs.readFileSync(keyFile, "utf8"));
    }

    return key;
}

function loadSecretKey(keyFile: string) {
    if (!fs.existsSync(keyFile)) {
        throw new ServerError("secret key file is missing", 500);
    }
    return parseKey(fs.readFileSync(keyFile, "utf8"));
}

export function encryptSecret(plain: string, keyFile = SECRET_KEY_FILE) {
    const key = ensureSecretKey(keyFile);
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

    return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}

export function decryptSecret(value: string, keyFile = SECRET_KEY_FILE) {
    if (!value.startsWith(PREFIX)) {
        throw new ServerError("secret is not encrypted", 500);
    }

    const key = loadSecretKey(keyFile);
    const raw = Buffer.from(value.slice(PREFIX.length), "base64");
    // Node would otherwise accept a cut-down GCM tag, making a forged value far easier to guess.
    if (raw.length < IV_BYTES + TAG_BYTES) {
        throw new ServerError("secret could not be decrypted", 500);
    }

    const decipher = createDecipheriv(ALGORITHM, key, raw.subarray(0, IV_BYTES), { authTagLength: TAG_BYTES });
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));

    try {
        return Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
    } catch {
        // Usually means the key file was replaced; every cause gets the same message.
        throw new ServerError("secret could not be decrypted", 500);
    }
}
