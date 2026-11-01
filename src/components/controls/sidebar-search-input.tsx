"use client";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { SidebarGroupContent, SidebarInput } from "@/ui/sidebar";

export function SidebarSearchInput({ value, onChange, placeholder, className }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}) {
    return (
        <SidebarGroupContent className={cn("relative mt-1", className)}>
            <SidebarInput value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8" />
            <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 select-none" />
        </SidebarGroupContent>
    );
}
