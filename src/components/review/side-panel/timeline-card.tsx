import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Cards in the comment and event panels. The border colour tells the card's state at a glance:
// selected by the user, active at the current playback time, or what the item carries.
const timelineCardVariants = cva(
    "bg-card text-card-foreground flex flex-col gap-2 rounded-xl border py-3 shadow-sm cursor-pointer transition-colors hover:bg-card/80",
    {
        variants: {
            state: {
                none: "",
                selected: "border-primary bg-primary/20",
                active: "border-foreground",
                issue: "border-success",
                drawing: "border-info",
                "issue-drawing": "border-warning",
                link: "border-info",
            },
        },
        defaultVariants: { state: "none" },
    },
);

export type TimelineCardState = NonNullable<VariantProps<typeof timelineCardVariants>["state"]>;

export function TimelineCard({ state, className, ...props }: React.ComponentProps<"div"> & VariantProps<typeof timelineCardVariants>) {
    return <div data-slot="timeline-card" className={cn(timelineCardVariants({ state }), className)} {...props} />;
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
