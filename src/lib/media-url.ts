import { api } from "@/api";

export async function resolveMediaUrl(filePath: string): Promise<string | undefined> {
    // hc substitutes the :path{.*} param verbatim, so keys with spaces or "#" must be encoded here.
    const res = await api.media.resolver[":path{.*}"].$get({ param: { path: encodeURI(filePath) } });
    if (res.status !== 200) return undefined;
    return (await res.json()).url;
}
