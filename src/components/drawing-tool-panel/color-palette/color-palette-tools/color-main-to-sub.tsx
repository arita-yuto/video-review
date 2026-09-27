import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightLeft } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/ui/button";
import { ColorSwatch } from "@/components/controls/color-swatch";
import { cn } from "@/lib/utils";

/** The colour in use and the one kept aside, with the swap between them. */
export function ColorMainToSub({ color, subColor, swapTitle, className, onSwap }: {
    color: string;
    subColor: string;
    swapTitle: string;
    className?: string;
    onSwap: () => void;
}) {
    return (
        <div className={cn("flex items-center gap-1", className)}>
            <ColorSwatch color={color} selected />
            <Button variant="ghost" size="icon-sm" title={swapTitle} onClick={onSwap}>
                <FontAwesomeIcon icon={faRightLeft} />
            </Button>
            <ColorSwatch color={subColor} onSelect={onSwap} />
        </div>
    );
}
