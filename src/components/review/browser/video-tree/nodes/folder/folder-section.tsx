import type { ReactNode } from "react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { SidebarMenuHeader, SidebarMenuItem, SidebarMenuSub } from "@/components/ui/sidebar";

// The header's height (SidebarMenuButton's default h-8), so nested headers can stick one
// header below their parent and items can scroll clear of the stacked headers.
const FOLDER_HEADER_REM = 2;

type Props = {
    // How many headers are stacked above this one.
    depth: number;
    open: boolean;
    onToggle: () => void;
    // What the sticky header holds, such as a FolderHeaderButton and its actions.
    header: ReactNode;
    children: ReactNode;
};

// A folder that opens and closes, with a header that stays on screen while its contents scroll.
export function FolderSection({ depth, open, onToggle, header, children }: Props) {
    return (
        <SidebarMenuItem>
            <Collapsible open={open} onOpenChange={onToggle}>
                <SidebarMenuHeader style={{ "--sticky-top": `${depth * FOLDER_HEADER_REM}rem` } as React.CSSProperties}>
                    {header}
                </SidebarMenuHeader>

                <CollapsibleContent>
                    <SidebarMenuSub
                        inset="start"
                        // Inherited by items for their scroll margin.
                        style={{ "--item-scroll-margin": `${(depth + 1) * FOLDER_HEADER_REM}rem` } as React.CSSProperties}
                    >
                        {children}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </Collapsible>
        </SidebarMenuItem>
    );
}
