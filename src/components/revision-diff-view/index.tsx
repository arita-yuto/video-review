"use client"
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import { Video, VideoComment, VideoRevision } from "@/lib/db-types";
import { LoadingBadge } from "@/components/controls/loading-badge";
import { SeekBar, commentMarkers } from "@/components/video-timeline-bar";
import { PlayButton, VolumeControl, TimeDisplay, PlaybackRateSelect } from "@/components/video-control-panel/playback";
import { useDiffSync } from "./use-diff-sync";
import { CommentSide, useRevisionComments } from "./comment-side";
import { DiffStage, ModeTabs, RevisionSelect } from "./stage";

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
                <div className="flex items-center justify-between gap-3">
                    <RevisionSelect revisions={revisions} revision={left} onChange={(r) => setSide("left", r)} />
                    <ModeTabs />
                    <RevisionSelect revisions={revisions} revision={right} onChange={(r) => setSide("right", r)} />
                </div>
                <DiffStage left={left} right={right} leftRef={leftRef} rightRef={rightRef} />
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
