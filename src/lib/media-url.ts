import { api } from "@/api";

export type MediaSizes = { original: number | null; downscaled: { width: number; size: number }[] };

export async function resolveMediaUrl(filePath: string): Promise<string | undefined> {
    // hc substitutes the :path{.*} param verbatim, so keys with spaces or "#" must be encoded here.
    const res = await api.media.resolver[":path{.*}"].$get({ param: { path: encodeURI(filePath) } });
    if (res.status !== 200) return undefined;
    return (await res.json()).url;
}

// filePath is the original video's storage key; the sizes are in bytes.
export async function readMediaSizes(filePath: string): Promise<MediaSizes | undefined> {
    try {
        const res = await api.media.sizes[":path{.*}"].$get({ param: { path: encodeURI(filePath) } });

        if (res.status !== 200) {
            return undefined;
        }

        return await res.json();
    } catch {
        return undefined;
    }
}
