"use client";

import { AccountAvatar } from "@/components/controls/account-avatar";

// Who is signed in: avatar, display name and email. A guest has no email, so only the name shows.
export function AccountSummary({ displayName, email }: { displayName: string; email: string | null }) {
    return (
        <>
            <AccountAvatar email={email} className="size-8" />
            <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
            </div>
        </>
    );
}
