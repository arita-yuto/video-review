import { Badge } from "@/components/ui/badge";
import type { Mark } from "@/components/review/browser/marks/marks";

export const newMark: Mark = {
    key: "new",
    // Counted from the previous visit rather than from midnight, so uploads made late at night still show as new.
    // Hidden once this user opens the latest revision; the visit keeps never-opened old videos dark.
    isShown: (video, { previousVisitAt, seenRevisions }) => {
        const latest = video.latestRevision;
        if (previousVisitAt === null || !latest?.uploadedAt) {
            return false;
        }

        const uploadedSinceVisit = new Date(latest.uploadedAt).getTime() > previousVisitAt;
        const latestUnseen = (seenRevisions[video.id] ?? 0) < latest.revision;
        return uploadedSinceVisit && latestUnseen;
    },
    render: () => <NewBadge />,
};

function NewBadge() {
    return <Badge variant="destructive" size="xs">NEW</Badge>;
}
