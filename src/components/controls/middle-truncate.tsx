const DEFAULT_TAIL = 14;

// Truncates the head and always keeps the tail: names in one folder share long prefixes and differ at the end (take, scene, version suffixes).
export function MiddleTruncate({ text, tail = DEFAULT_TAIL }: { text: string; tail?: number }) {
    const cut = Math.max(0, text.length - tail);

    return (
        <span data-slot="middle-truncate" className="flex min-w-0 whitespace-nowrap">
            <span className="min-w-0 truncate">{text.slice(0, cut)}</span>
            <span className="shrink-0">{text.slice(cut)}</span>
        </span>
    );
}
