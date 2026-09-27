import React from "react";
import { Button } from "@/ui/button";
import type { ColorMode } from "@/lib/drawing/types";
import { ColorModeIcon } from "@/lib/drawing/icon";

// Shows the shape it switches to, the way paint apps do: a triangle (HLS) while the
// square is up, a square (HSV) while the triangle is.
export function ColorModeSwitch({ mode, title, className, onChange }: {
    mode: ColorMode;
    title: string;
    className?: string;
    onChange: (mode: ColorMode) => void;
}) {
    const next: ColorMode = mode === "hsv" ? "hls" : "hsv";
    return (
        <Button variant="ghost" size="icon-sm" className={className} title={title} onClick={() => onChange(next)}>
            <ColorModeIcon mode={next} className="size-5" />
        </Button>
    );
}
