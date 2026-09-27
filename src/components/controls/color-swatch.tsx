import React from "react";
import { cn } from "@/lib/utils";

/** A colour chip. With a handler it is a button; without one it only displays the colour. */
export function ColorSwatch({ color, selected, onSelect }: {
    color: string;
    selected?: boolean;
    onSelect?: () => void;
}) {
    const className = cn(
        "size-7 rounded-md border bg-(--swatch) transition-all",
        selected ? "border-primary ring-2 ring-primary/50" : "border-input",
        onSelect && !selected && "hover:border-ring",
    );
    const style = { "--swatch": color } as React.CSSProperties;

    if (!onSelect) return <div title={color} className={className} style={style} />;

    return <button type="button" title={color} aria-pressed={selected} onClick={onSelect} className={className} style={style} />;
}
