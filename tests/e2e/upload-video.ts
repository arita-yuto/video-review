import { expect, type APIRequestContext } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Seeded admin user (see prisma/seed/user.ts).
const UPLOADER = { email: "Bocchi@example.com", password: "pass123" };
const VIDEO = path.join(process.cwd(), "tests/fixtures/preview.mp4");

// The seed ships no media bytes, so a test that plays brings its own video; the upload screen has its own test.
// The same title again adds a revision to that video.
export async function uploadVideo(request: APIRequestContext, title: string): Promise<string> {
    const signedIn = await request.post("/api/v1/auth/login/password", { data: UPLOADER });
    const auth = { Authorization: `Bearer ${(await signedIn.json()).token}` };

    const init = await request.post("/api/v1/videos/upload/init", { headers: auth, multipart: { title, folderKey: "e2e-media" } });
    const { url, session } = await init.json() as { url: string; session: { id: string } };

    const bytes = fs.readFileSync(VIDEO);
    const transfer = await request.post(url, {
        headers: {
            ...auth,
            "Tus-Resumable": "1.0.0",
            "Upload-Length": String(bytes.length),
            "Upload-Metadata": `sessionId ${Buffer.from(session.id).toString("base64")}`,
            "Content-Type": "application/offset+octet-stream",
        },
        data: bytes,
    });
    expect(transfer.ok()).toBe(true);

    const finish = await request.post(`/api/v1/videos/upload/finish?session_id=${session.id}`, { headers: auth });
    expect(finish.ok()).toBe(true);
    return (await finish.json()).videoId as string;
}
