import type { ReactNode } from "react";
import { Badge } from "@/ui/badge";
import { Spinner } from "@/ui/spinner";

export function LoadingBadge({ children }: { children: ReactNode }) {
    return (
        <Badge variant="outline">
            <Spinner className="text-primary" />
            {children}
        </Badge>
    );
}
