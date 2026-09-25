import type { ReactNode } from "react";

export function AdminSection({ title, children }: { title: ReactNode; children: ReactNode }) {
    return (
        <div className="flex flex-col h-full min-h-0 gap-3">
            <h3 className="shrink-0 text-base font-medium">{title}</h3>
            {children}
        </div>
    );
}
