import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/db";

// A key without a row is cached too, so an env-only setup does not query the database on every read.
const cache = new Map<string, { value: Prisma.JsonValue | undefined }>();

// The admin screen's value wins; env is the fallback for setups configured without it.
export async function getSetting<T extends Prisma.JsonValue>(key: string, fallback: T | undefined): Promise<T | undefined> {
    let entry = cache.get(key);
    if (!entry) {
        const row = await prisma.systemSetting.findUnique({ where: { key } });
        entry = { value: row?.value };
        cache.set(key, entry);
    }

    return entry.value === undefined ? fallback : (entry.value as T);
}

export async function saveSetting(key: string, value: Prisma.InputJsonValue) {
    await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
    cache.delete(key);
}

export async function deleteSetting(key: string) {
    await prisma.systemSetting.deleteMany({ where: { key } });
    cache.delete(key);
}
