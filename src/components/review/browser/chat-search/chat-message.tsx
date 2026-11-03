"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChatTurn, useChatSearchStore } from "@/components/review/browser/stores/chat-search-store";
import { useSidebar } from "@/ui/sidebar";
import { externalLink, MarkdownText } from "@/components/controls/markdown-text";

function toInternalPath(href: string | undefined): string | null {
    if (!href) return null;
    if (href.startsWith("/") && !href.startsWith("//")) return href;
    if (typeof window === "undefined") return null;
    try {
        const url = new URL(href, window.location.origin);
        return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : null;
    } catch {
        return null;
    }
}

export function ChatMessage({ turn }: { turn: ChatTurn }) {
    const isUser = turn.role === "user";
    const close = useChatSearchStore((s) => s.close);
    const { isMobile, setOpenMobile } = useSidebar();

    // While the list is a sheet, it and the chat both cover the player, so following a link closes them.
    const handleNavigate = () => {
        if (isMobile) {
            close();
            setOpenMobile(false);
        }
    };

    return (
        <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
            <div
                className={cn(
                    "max-w-5/6 rounded-lg px-3 py-2 text-sm break-words",
                    isUser ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
                )}
            >
                {isUser ? turn.content : (
                    <MarkdownText
                        link={(href, children) => {
                            // Tool results carry absolute URLs so they work outside the app too;
                            // inside the app, same-origin ones navigate without a reload.
                            const internal = toInternalPath(href);
                            if (internal) {
                                return (
                                    <Link href={internal} onClick={handleNavigate} className="underline text-primary hover:text-primary-strong">
                                        {children}
                                    </Link>
                                );
                            }
                            return externalLink(href, children);
                        }}
                    >
                        {turn.content}
                    </MarkdownText>
                )}
            </div>
        </div>
    );
}
