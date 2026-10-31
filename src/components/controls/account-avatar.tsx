"use client";

import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { useAvatarStore } from "@/components/stores/avatar-store";

// The signed-in user's picture; a guest has no email, so the fallback shows.
export function AccountAvatar({ email, className }: { email: string | null; className?: string }) {
    const { icon, fetchAvatar } = useAvatarStore();

    useEffect(() => {
        if (email) {
            void fetchAvatar(email);
        }
    }, [email]);

    const src = email ? icon(email) : undefined;

    return (
        <Avatar className={className}>
            {src ? <AvatarImage src={src} /> : <AvatarFallback />}
        </Avatar>
    );
}
