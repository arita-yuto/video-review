import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// The column a panel fills: the sidebar surface and its right border.
const panelVariants = cva("bg-sidebar flex h-full w-full flex-col border-r", {
    variants: {
        variant: {
            docked: "",
            floating: "shadow-2xl",
        },
    },
    defaultVariants: { variant: "docked" },
});

export function Panel({ variant, className, ...props }: React.ComponentProps<"div"> & VariantProps<typeof panelVariants>) {
    return <div data-slot="panel" className={cn(panelVariants({ variant }), className)} {...props} />;
}
