"use client";

import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/avatar";
import { useAvatarStore } from "@/stores/avatar-store";

// Who is signed in: avatar, display name and email. A guest has no email, so only the name shows.
export function AccountSummary({ displayName, email }: { displayName: string; email: string | null }) {
    const { icon, fetchAvatar } = useAvatarStore();

    useEffect(() => {
        if (email) {
            void fetchAvatar(email);
        }
    }, [email]);

    const src = email ? icon(email) : undefined;

    return (
        <>
            <Avatar className="size-8">
                {src ? <AvatarImage src={src} /> : <AvatarFallback />}
            </Avatar>
            <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
            </div>
        </>
    );
}
