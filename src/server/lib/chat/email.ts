import { ChatType } from "@/server/lib/chat/chat-type";
import { createTransport, getEmailConfig } from "@/server/lib/integrations/email";

function toEmailMessage(ctx: ChatType) {
    return {
        subject: `[VideoReview] ${ctx.videoTitle}`,
        lines: [
            ctx.folderKey && ctx.videoTitle
                ? `${ctx.folderKey}/${ctx.videoTitle}`
                : ctx.videoTitle,
            "",
            ctx.userName,
            ctx.commentText,
            "",
            ctx.videoLink && `Video: ${ctx.videoLink}`,
            ctx.scenePath && ctx.sceneLink && `Scene: ${ctx.sceneLink}`,
        ].filter(Boolean),
    };
}

export async function chatEmail(ctx: ChatType): Promise<boolean> {
    const config = await getEmailConfig();
    const enable = config.enable === "true";
    const smtpHost = config.host;
    const smtpPort = config.port;
    const from = config.from;
    const to = ctx.email;

    console.info("[email] called", {
        enable,
        smtpHost,
        smtpPort,
        from,
        to,
        commentId: ctx.commentId,
    });

    if (!enable) {
        console.info("[email] disabled by config");
        return false;
    }

    if (!smtpHost || !smtpPort || !from) {
        console.error("[email] missing smtp config", {
            smtpHost,
            smtpPort,
            from,
        });
        return false;
    }

    if (!to) {
        console.error("[email] missing recipient email", {
            commentId: ctx.commentId,
        });
        return false;
    }

    const msg = toEmailMessage(ctx);

    console.debug("[email] message built", {
        subject: msg.subject,
        lines: msg.lines.length,
    });

    const transporter = createTransport(config);

    try {
        console.info("[email] sending...", {
            host: smtpHost,
            port: smtpPort,
        });

        const info = await transporter.sendMail({
            from,
            to,
            subject: msg.subject,
            text: msg.lines.join("\n"),
        });

        console.info("[email] sent", {
            messageId: info.messageId,
            response: info.response,
        });

        return true;
    } catch (err) {
        console.error("[email] send failed", {
            error: err instanceof Error ? err.message : err,
        });
        return false;
    }
}