"use client";

import React, { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/ui/button";
import { useTranslations } from "next-intl";
import { useChatSearchStore } from "@/stores/chat-search-store";
import { ChatMessage } from "@/components/chat-search/chat-message";
import { ChatInput } from "@/components/chat-search/chat-input";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

export function ChatSearchPanel() {
    const t = useTranslations("chat-search");
    const { isOpen, close, history, isLoading, error, sendMessage, clear } = useChatSearchStore();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history, isLoading]);

    return (
        <Sheet open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
            <SheetContent side="right" className="w-100">
                <SheetHeader className="flex flex-row items-center justify-between py-2 border-b shrink-0">
                    <SheetTitle className="text-sm">{t("title")}</SheetTitle>
                    {history.length > 0 && (
                        // Keep clear of the sheet's own close button in the corner.
                        <Button variant="ghost" size="icon-sm" onClick={clear} title={t("clearHistory")} className="mr-8">
                            <Trash2 />
                        </Button>
                    )}
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                    {history.length === 0 && (
                        <p className="text-muted-foreground text-xs text-center mt-4">
                            {t("emptyState")}
                        </p>
                    )}
                    {history.map((turn, i) => (
                        <ChatMessage key={i} turn={turn} />
                    ))}
                    {isLoading && (
                        <div className="flex items-start">
                            <div className="bg-accent rounded-lg px-3 py-2 text-sm text-muted-foreground">
                                {t("loading")}
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="text-xs text-destructive text-center">{t(`error.${error}`)}</div>
                    )}
                    <div ref={bottomRef} />
                </div>
                <ChatInput onSend={sendMessage} disabled={isLoading} />
            </SheetContent>
        </Sheet>
    );
}
