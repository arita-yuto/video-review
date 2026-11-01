import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/ui/input";

export type Renamer = {
    name: string;
    // A reason the name can't be used, checked as it is typed.
    check: (name: string) => string | null;
    // Saves the name and returns a reason it was refused, or null once it is saved.
    commit: (name: string) => Promise<string | null>;
};

type Props = {
    renamer: Renamer;
    onRenamed: () => void;
    onCancelled: () => void;
};

// Behaves like renaming in Explorer and Finder: the whole name starts selected, Enter or clicking
// away commits, Esc cancels, and an emptied name falls back to the old one.
export function RenameInput({ renamer, onRenamed, onCancelled }: Props) {
    const { name } = renamer;
    const ref = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState(name);
    const [refused, setRefused] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    // Removing the input can fire blur, which must not commit a rename that was cancelled.
    const cancelled = useRef(false);
    // Clicking away commits, so the input may be gone before the server answers.
    const mounted = useRef(true);

    useEffect(() => {
        // Set here as well as in the ref's initial value: StrictMode mounts twice in development.
        mounted.current = true;
        // It can open out of view, such as for a folder just made below open folders.
        ref.current?.scrollIntoView({ block: "nearest" });
        ref.current?.select();

        return () => {
            mounted.current = false;
        };
    }, []);

    const next = value.trim();
    const problem = next === "" || next === name ? null : renamer.check(next);
    const error = problem ?? refused;

    const cancel = () => {
        cancelled.current = true;
        onCancelled();
    };

    const commit = async () => {
        if (saving || cancelled.current) {
            return;
        }
        if (next === "" || next === name) {
            cancel();
            return;
        }
        if (problem) {
            return;
        }

        setSaving(true);
        const reason = await renamer.commit(next);
        if (!reason) {
            // Stays saving while the list is read back, so a blur meanwhile doesn't save again.
            onRenamed();
            return;
        }

        if (mounted.current) {
            setSaving(false);
            setRefused(reason);
        } else {
            toast.error(reason);
        }
    };

    return (
        <div className="min-w-0 flex-1">
            <Input
                ref={ref}
                value={value}
                aria-invalid={!!error || undefined}
                // Not disabled: that drops focus, and the field has to stay usable after a refusal.
                readOnly={saving}
                onChange={(e) => {
                    setValue(e.target.value);
                    setRefused(null);
                }}
                onKeyDown={(e) => {
                    // Keeps the page's own key listeners, such as the drawing and panel shortcuts,
                    // from reacting to typing.
                    e.stopPropagation();
                    // Enter and Esc also confirm and cancel an IME conversion (Safari reports
                    // keyCode 229 instead of isComposing).
                    if (e.nativeEvent.isComposing || e.keyCode === 229) {
                        return;
                    }
                    if (e.key === "Enter") {
                        e.preventDefault();
                        void commit();
                    } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancel();
                    }
                }}
                onBlur={() => void commit()}
            />
            {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        </div>
    );
}
