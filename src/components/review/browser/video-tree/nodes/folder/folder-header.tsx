import type { ComponentProps, ReactNode } from "react";
import { Folder, FolderOpen } from "lucide-react";
import { FolderPath } from "@/components/controls/folder-path";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenuButton } from "@/components/ui/sidebar";

function FolderIcon({ open }: { open: boolean }) {
    return open ? <FolderOpen className="text-primary" /> : <Folder className="text-primary" />;
}

type ButtonProps = ComponentProps<"button"> & {
    names: string[];
    path: string;
    open: boolean;
    total: number;
    // Shown at the right end.
    marks?: ReactNode;
};

// The header that opens and closes its folder. Other button props, such as key handlers, pass
// through to the button.
export function FolderHeaderButton({ names, path, open, total, marks, ...props }: ButtonProps) {
    return (
        <CollapsibleTrigger asChild>
            <SidebarMenuButton {...props} title={path || "/"}>
                <FolderIcon open={open} />
                <FolderPath names={names} count={total} />

                {marks}
            </SidebarMenuButton>
        </CollapsibleTrigger>
    );
}

// The header with a field in place of the name, as a plain element since a field can't sit
// inside a button.
export function FolderHeaderField({ open, children }: { open: boolean; children: ReactNode }) {
    return (
        <SidebarMenuButton asChild size="auto">
            <div>
                <FolderIcon open={open} />
                {children}
            </div>
        </SidebarMenuButton>
    );
}
