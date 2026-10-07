"use client";

import { useRef } from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/ui/button";

// The native file input keeps its own "Choose file" caption next to the chosen name, in the
// browser's language. This shows only the placeholder or the chosen name.
export function FilePicker({ accept, file, placeholder, onChange }: {
    accept: string;
    file: File | null;
    placeholder: string;
    onChange: (file: File | null) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <>
            <Button type="button" variant="outline" className="w-full justify-start" onClick={() => inputRef.current?.click()}>
                <FileUp />
                <span className="truncate">{file ? file.name : placeholder}</span>
            </Button>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                    onChange(e.target.files?.[0] ?? null);
                    // Cleared so picking the same file again, after editing it, still fires a change.
                    e.target.value = "";
                }}
            />
        </>
    );
}
