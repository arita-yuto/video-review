"use client";

import type { ComponentType } from "react";
import { Button } from "@/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/tooltip";

// An icon carries the action, so the name it exposes has to say which row it belongs to.
export function IconAction({ icon: Icon, tooltip, label, onClick }: {
    icon: ComponentType;
    tooltip: string;
    label: string;
    onClick: () => void;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="destructive" size="icon" aria-label={label} onClick={onClick}>
                    <Icon />
                </Button>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    );
}
