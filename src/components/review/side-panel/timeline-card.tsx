import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// The border colour shows selected, active or linked; a revision adds a bar in its colour.
const timelineCardVariants = cva(
    "bg-card text-card-foreground flex flex-col gap-2 rounded-xl border py-3 shadow-sm cursor-pointer transition-colors hover:bg-card/80",
    {
        variants: {
            state: {
                none: "",
                selected: "border-primary bg-primary/20",
                active: "border-foreground",
                link: "border-info",
            },
        },
        defaultVariants: { state: "none" },
    },
);

export type TimelineCardState = NonNullable<VariantProps<typeof timelineCardVariants>["state"]>;

export function TimelineCard({ state, revision, className, style, ...props }: React.ComponentProps<"div"> & VariantProps<typeof timelineCardVariants> & { revision?: number }) {
    return (
        <div
            data-slot="timeline-card"
            className={cn(timelineCardVariants({ state }), revision !== undefined && "revision-bar", className)}
            style={revision !== undefined ? { ...style, "--revision": revision } as React.CSSProperties : style}
            {...props}
        />
    );
}

export function TimelineCardHeader({ children }: { children: ReactNode }) {
    return <div className="flex flex-row items-center justify-between px-3">{children}</div>;
}

export function TimelineCardContent({ children }: { children: ReactNode }) {
    return <div className="px-3">{children}</div>;
}

export function TimelineCardFooter({ children }: { children: ReactNode }) {
    return <div className="flex justify-end px-3">{children}</div>;
}
