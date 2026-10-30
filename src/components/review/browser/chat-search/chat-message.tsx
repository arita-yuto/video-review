"use client";

import Markdown from "react-markdown";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChatTurn, useChatSearchStore } from "@/stores/chat-search-store";
import { useSidebar } from "@/ui/sidebar";
import { useIsMobile } from "@/lib/hooks/use-mobile";

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
    const isMobile = useIsMobile();
    const { setOpenMobile } = useSidebar();

    // On the mobile layout the chat and the video list are both sheets over the player, so following a link closes them.
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
                    <div className="flex flex-col gap-2">
                        <Markdown
                            components={{
                                p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-5 flex flex-col gap-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-5 flex flex-col gap-1">{children}</ol>,
                                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                h1: ({ children }) => <p className="font-semibold text-primary mt-1">{children}</p>,
                                h2: ({ children }) => <p className="font-semibold text-primary mt-1">{children}</p>,
                                h3: ({ children }) => <p className="font-semibold text-primary mt-1">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                code: ({ children }) => <code className="rounded bg-background px-1 text-primary">{children}</code>,
                                a: ({ href, children }) => {
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
                                    return (
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary-strong">
                                            {children}
                                        </a>
                                    );
                                },
                            }}
                        >
                            {turn.content}
                        </Markdown>
                    </div>
                )}
            </div>
        </div>
    );
}
