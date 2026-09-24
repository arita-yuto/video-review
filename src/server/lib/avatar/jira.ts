import { getJiraConfig } from "@/server/lib/settings/jira";

export async function avatar(email: string): Promise<Buffer<ArrayBuffer> | undefined> {
    const { baseUrl: base, token } = await getJiraConfig();

    if (!base || !token) {
        return undefined;
    }

    const infoRes = await fetch(
        `${base}/rest/api/2/user/avatars?username=${email}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        }
    );

    if (!infoRes.ok) {
        return undefined;
    }

    const info = await infoRes.json();
    const latest =
        info.custom?.find((a: any) => a.isSelected) ??
        info.system?.find((a: any) => a.isSelected);

    if (!latest || !latest.owner) {
        return undefined;
    }

    const avatarUrl = `${base}/secure/useravatar?ownerId=${latest.owner}&avatarId=${latest.id}`;
    const imgRes = await fetch(avatarUrl, {headers: { Authorization: `Bearer ${token}` }});


    if (!imgRes.ok) {
        return undefined;
    }
    return Buffer.from(await imgRes.arrayBuffer());
}