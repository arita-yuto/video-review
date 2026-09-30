"use client"
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCodeCompare } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/ui/button";
import { VideoRevision } from "@/lib/db-types";
import { usePlaybackStoreApi } from "@/stores/playback-store";

export function CompareButton({ revisions, selected }: { revisions: VideoRevision[], selected: VideoRevision }) {
    const t = useTranslations("revision-diff-view");
    const router = useRouter();
    const playback = usePlaybackStoreApi();

    // Revisions come newest first.
    const newest = revisions[0];
    const left = selected.id === newest.id ? revisions[1] : selected;

    const open = () => {
        const time = playback.getState().currentTime;
        router.push(`/video-review/diff/${selected.videoId}?left=${left.revision}&right=${newest.revision}&t=${time}`);
    };

    return (
        <Button variant="ghost" size="sm" onClick={open}>
            <FontAwesomeIcon icon={faCodeCompare} />
            {t("compare")}
        </Button>
    );
}
