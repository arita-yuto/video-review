import { ChatType } from "@/server/lib/chat/chat-type";
import { getSlackClient, getSlackConfig } from "@/server/lib/integrations/slack";
import { prisma } from "@/server/lib/db";

export async function chatSlack(ctx: ChatType): Promise<boolean> {
    let SlackClient: Awaited<ReturnType<typeof getSlackClient>>;
    try {
        SlackClient = await getSlackClient();
    } catch {
        // A saved token that cannot be decrypted must not stop the webhook and email posts after this one.
        return false;
    }
    if (!SlackClient){
        return false;
    }
    
    const { channel } = await getSlackConfig();
    if (!channel) {
        console.warn("slack channel missing");
        return false;
    }

    if (!ctx.screenshot) {
        console.warn("not found screenshot");
        return false;
    }

    const file = ctx.screenshot as File;
    const name = file.name;
    const size = file.size;
    let comment = "";
    comment += `${ctx.folderKey}/${ctx.videoTitle}\n`;
    comment += `${ctx.userName}\n`;
    comment += `${ctx.commentText}\n`;
    comment += `<${ctx.videoLink}|VideoReview LINK>\n`;
    if (ctx.scenePath) {
        comment += `<${ctx.sceneLink}|Open Scene>\n`;
    }

    const preparResponce = await SlackClient.files.getUploadURLExternal({ filename: name, length: size });
    if (!preparResponce.ok) {
        console.warn("failed to prepare slack upload");
        return false;
    }

    const uploadUrl = preparResponce.upload_url!;
    const fileId = preparResponce.file_id!;

    const form = new FormData();
    form.append('filename', name);
    form.append('file', file, name);

    const uploadResponce = await fetch(uploadUrl, {
        method: "POST",
        body: form
    });

    if (!uploadResponce.ok) {
        console.warn("failed to upload file to slack");
        return false;
    }

    const chatRes = await SlackClient.chat.postMessage({
        channel,
        text: comment
    });

    if (!chatRes.ok || !chatRes.ts || !chatRes.channel) {
        console.warn("failed to post slack message");
        return false;
    }

    const filesRes = await SlackClient.files.completeUploadExternal({
        channel_id: channel,
        files: [{ id: fileId, title: name }]
    });

    if (!filesRes.ok) {
        await SlackClient.chat.postMessage({
            channel,
            thread_ts: chatRes.ts,
            text: "file upload failed",
        });
        console.warn("failed to upload file");
        return false;
    }

    await prisma.slackMessage.create({
        data: {
            videoCommentId: ctx.commentId,
            ts: chatRes.ts.replace('.', ''),
            channelId: chatRes.channel,
        },
    });
    
    return true;
}