"use client";

import React, { useState, useRef, useEffect } from "react";
import { SendHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
    const t = useTranslations("chat-search");
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!disabled && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [disabled]);

    const handleSend = () => {
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setValue("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter sends, Shift+Enter keeps the newline. The Enter that confirms an IME
        // conversion reports isComposing (Safari reports keyCode 229 instead) and is ignored.
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex items-end gap-2 border-t p-3">
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                rows={1}
                placeholder={t("inputPlaceholder")}
                className="flex-1 min-h-9 max-h-30 overflow-y-auto resize-none"
                onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                }}
            />
            <Button variant="toolbar" size="icon-sm" onClick={handleSend} disabled={!value.trim() || disabled} className="mb-0.5">
                <SendHorizontal />
            </Button>
        </div>
    );
}
