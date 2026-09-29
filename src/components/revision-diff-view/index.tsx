"use client"
import { Ref, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import { Video, VideoComment, VideoRevision } from "@/lib/db-types";
import { resolveMediaUrl } from "@/lib/media-url";
import { useLocale } from "@/app/locale-provider";
import { LoadingBadge } from "@/components/controls/loading-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { SeekBar, commentMarkers } from "@/components/video-timeline-bar";
import { PlayButton, VolumeControl, TimeDisplay, PlaybackRateSelect } from "@/components/video-control-panel/playback";
import { useVideoPlayerStore } from "@/stores/video-player-store";
import { useDiffSync } from "./use-diff-sync";
import { CommentSide, useRevisionComments } from "./comment-side";

const LEFT_MARKER = "bg-info";
const RIGHT_MARKER = "bg-warning";

// Revisions come newest first; without ?left/?right the newest is compared with the one before it.
const pickRevision = (revisions: VideoRevision[], param: string | null, fallback: number) =>
    revisions.find((r) => String(r.revision) === param) ?? revisions[fallback];

export default function RevisionDiffView({ videoId }: { videoId: string }) {
    const t = useTranslations("revision-diff-view");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [video, setVideo] = useState<Video | null>(null);
    const [revisions, setRevisions] = useState<VideoRevision[] | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);

    const leftRef = useRef<HTMLVideoElement>(null);
    const rightRef = useRef<HTMLVideoElement>(null);
    const ready = revisions !== null && revisions.length >= 2;
    useDiffSync(rightRef, leftRef, ready);

    const left = ready ? pickRevision(revisions, searchParams.get("left"), 1) : undefined;
    const right = ready ? pickRevision(revisions, searchParams.get("right"), 0) : undefined;
    const leftComments = useRevisionComments(left);
    const rightComments = useRevisionComments(right);
    const markers = useMemo(
        () => [...commentMarkers(leftComments, LEFT_MARKER), ...commentMarkers(rightComments, RIGHT_MARKER)],
        [leftComments, rightComments],
    );

    // ?t= starts both sides at a position, e.g. when coming back from the review page.
    useEffect(() => {
        const primary = rightRef.current;
        const start = parseFloat(searchParams.get("t") ?? "");
        if (!ready || !primary || !Number.isFinite(start)) return;

        const seek = () => { primary.currentTime = start; };
        primary.addEventListener("loadedmetadata", seek, { once: true });
        return () => primary.removeEventListener("loadedmetadata", seek);
    }, [ready]);

    useEffect(() => {
        void (async () => {
            const [videoRes, revisionsRes] = await Promise.all([
                api.videos[":id"].$get({ param: { id: videoId } }),
                api.videos[":id"].revisions.$get({ param: { id: videoId } }),
            ]);
            if (videoRes.status !== 200 || revisionsRes.status !== 200) {
                setNotFound(true);
                return;
            }
            setVideo(await videoRes.json());
            setRevisions(await revisionsRes.json());
        })();
    }, [videoId]);

    if (notFound) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                {t("notFound")}
            </div>
        );
    }

    if (revisions === null) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <LoadingBadge>{t("loading")}</LoadingBadge>
            </div>
        );
    }

    if (!left || !right) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                {t("needsTwoRevisions")}
            </div>
        );
    }

    const setSide = (side: "left" | "right", revision: string) => {
        const params = new URLSearchParams(searchParams);
        params.set(side, revision);
        params.delete("t");
        router.replace(`${pathname}?${params}`);
    };
    const seek = (time: number) => { if (rightRef.current) rightRef.current.currentTime = time; };
    const selectComment = (comment: VideoComment) => {
        setSelectedCommentId(comment.id);
        seek(comment.time);
    };
    // Written straight into history: a router.replace would be dropped by the navigation that follows.
    const rememberPosition = (time: number) => {
        const params = new URLSearchParams(searchParams);
        params.set("t", String(time));
        window.history.replaceState(null, "", `${pathname}?${params}`);
    };

    return (
        <div className="flex flex-1 min-w-0 p-3 gap-3">
            <CommentSide revision={left} comments={leftComments} markerClassName={LEFT_MARKER} selectedId={selectedCommentId} onSelect={selectComment} onLeave={rememberPosition} />
            <div className="flex flex-col flex-1 min-w-0 gap-3">
                <h2 className="px-2 text-lg font-semibold text-primary tracking-wide truncate">{video?.title}</h2>
                <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
                    <DiffSide revisions={revisions} revision={left} videoRef={leftRef} onChange={(r) => setSide("left", r)} />
                    <DiffSide revisions={revisions} revision={right} videoRef={rightRef} onChange={(r) => setSide("right", r)} />
                </div>
                <SeekBar markers={markers} onMarkerClick={seek} />
                <div className="flex items-center gap-3 bg-card rounded-lg px-3 py-2 border">
                    <PlayButton />
                    <VolumeControl />
                    <TimeDisplay />
                    <PlaybackRateSelect />
                </div>
            </div>
            <CommentSide revision={right} comments={rightComments} markerClassName={RIGHT_MARKER} selectedId={selectedCommentId} onSelect={selectComment} onLeave={rememberPosition} />
        </div>
    );
}

function DiffSide({ revisions, revision, videoRef, onChange }: {
    revisions: VideoRevision[],
    revision: VideoRevision,
    videoRef: Ref<HTMLVideoElement>,
    onChange: (revision: string) => void,
}) {
    const togglePlay = useVideoPlayerStore((s) => s.togglePlay);
    const t = useTranslations("video-title");
    const { locale } = useLocale();
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        let canceled = false;
        void (async () => {
            const resolved = await resolveMediaUrl(revision.filePath);
            if (!canceled) setUrl(resolved ?? null);
        })();
        return () => { canceled = true; };
    }, [revision.filePath]);

    return (
        <div className="flex flex-col gap-2 min-h-0 min-w-0">
            <Select value={String(revision.revision)} onValueChange={onChange}>
                <SelectTrigger size="sm" className="self-start">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {revisions.map((r) => (
                        <SelectItem key={r.id} value={String(r.revision)}>
                            {t("revisionOption", {
                                revision: r.revision,
                                date: new Date(r.uploadedAt).toLocaleDateString(locale)
                            })}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex-1 flex items-center justify-center bg-black rounded min-h-0">
                <video
                    ref={videoRef}
                    src={url ?? undefined}
                    onClick={togglePlay}
                    className="max-w-full max-h-full rounded cursor-pointer object-contain"
                />
            </div>
        </div>
    );
}
