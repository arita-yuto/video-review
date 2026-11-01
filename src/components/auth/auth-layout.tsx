"use client";
import type { CSSProperties, ReactNode } from "react";

// The login and bootstrap screens share this frame: a full-screen backdrop, a translucent panel with a title, and one or more cards holding the fields.
export function AuthLayout({ title, backgroundImageUrl, children }: {
    title: ReactNode;
    backgroundImageUrl?: string;
    children: ReactNode;
}) {
    // The image URL comes from configuration, so it reaches CSS through a custom property.
    const style = backgroundImageUrl ? { "--auth-bg": `url('${backgroundImageUrl}')` } as CSSProperties : undefined;
    return (
        <div className="auth-backdrop flex items-center justify-center w-screen h-full bg-background" style={style}>
            <div className="w-100 min-h-100 p-8 rounded-xl bg-card/80 shadow-panel backdrop-blur-sm border">
                <h1 className="text-lg mb-6 font-semibold text-center text-primary">{title}</h1>
                {children}
            </div>
        </div>
    );
}

export function AuthCard({ children }: { children: ReactNode }) {
    return <div className="rounded-2xl bg-card p-3 shadow-xl">{children}</div>;
}
