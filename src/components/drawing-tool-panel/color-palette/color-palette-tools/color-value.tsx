import React from "react";
import { cn } from "@/lib/utils";

/** The colour's numbers, as label and value pairs. Fixed-width digits keep the labels still. */
export function ColorValue({ entries, className }: { entries: [string, number][]; className?: string }) {
    return (
        <div className={cn("flex gap-2 text-xs text-muted-foreground tabular-nums leading-none", className)}>
            {entries.map(([label, value]) => (
                <span key={label} className="inline-flex gap-1">
                    <span>{label}</span>
                    <span className="w-6 text-right">{Math.round(value)}</span>
                </span>
            ))}
        </div>
    );
}
