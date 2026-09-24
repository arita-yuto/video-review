import "server-only";
import { prisma } from "@/server/lib/db";
import { decryptSecret, encryptSecret } from "@/server/lib/secret-box";

// Integration secrets sit in SystemSecret, apart from SystemSetting, so nothing that lists settings can return them.

const cache = new Map<string, { value: string | undefined }>();

export async function getSecretSetting(key: string, fallback: string | undefined): Promise<string | undefined> {
    let entry = cache.get(key);
    if (!entry) {
        const row = await prisma.systemSecret.findUnique({ where: { key } });
        try {
            entry = { value: row ? decryptSecret(row.valueHash) : undefined };
        } catch (e) {
            // env is deliberately not used instead: the saved token is what the admin chose, env may be stale.
            console.error(`[settings] saved secret ${key} could not be decrypted`);
            throw e;
        }
        cache.set(key, entry);
    }

    return entry.value ?? fallback;
}

// Checks for the row without decrypting it, so the admin screen still loads when the key file is gone.
export async function hasSavedSecret(key: string) {
    return (await prisma.systemSecret.count({ where: { key } })) > 0;
}

export async function saveSecretSetting(key: string, plain: string) {
    const stored = encryptSecret(plain);
    await prisma.systemSecret.upsert({
        where: { key },
        update: { valueHash: stored },
        create: { key, valueHash: stored },
    });
    cache.delete(key);
}

export async function deleteSecretSetting(key: string) {
    await prisma.systemSecret.deleteMany({ where: { key } });
    cache.delete(key);
}
