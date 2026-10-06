// The "NEW" marker for unread videos, shared by the sidebar list and the thumbnail grid.
export function NewBadge({ className }: { className?: string }) {
    return (
        <span className={`text-3xs px-1 py-px bg-destructive text-foreground rounded leading-none ${className ?? ""}`}>
            NEW
        </span>
    );
}
