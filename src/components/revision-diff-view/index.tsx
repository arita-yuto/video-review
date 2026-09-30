"use client"
import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import { Video, VideoComment, VideoRevision } from "@/lib/db-types";
import { LoadingBadge } from "@/components/controls/loading-badge";
import { SeekBar, commentMarkers } from "@/components/video-timeline-bar";
import { PlayButton, VolumeControl, TimeDisplay, PlaybackRateSelect } from "@/components/video-control-panel/playback";
import { PlaybackStoreProvider } from "@/stores/playback-store";
import { useDiffSync } from "./use-diff-sync";
import { CommentSide, useRevisionComments } from "./comment-side";
import { DiffStage, ModeTabs, RevisionSelect } from "./stage";

type Side = "left" | "right";

const MARKER: Record<Side, string> = { left: "bg-info", right: "bg-warning" };

// Revisions come newest first; without ?left/?right the newest is compared with the one before it.
const FALLBACK_INDEX: Record<Side, number> = { left: 1, right: 0 };

// The right side's audio plays and its clock drives both sides.
const PRIMARY: Side = "right";
const COMPARE: Side = PRIMARY === "right" ? "left" : "right";

export default function RevisionDiffView({ videoId }: { videoId: string }) {
    const t = useTranslations("revision-diff-view");
    const [video, setVideo] = useState<Video | null>(null);
    const [revisions, setRevisions] = useState<VideoRevision[] | null>(null);
    const [notFound, setNotFound] = useState(false);

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

    if (!video || !revisions) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <LoadingBadge>{t("loading")}</LoadingBadge>
            </div>
        );
    }

    if (revisions.length < 2) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                {t("needsTwoRevisions")}
            </div>
        );
    }

    return (
        <PlaybackStoreProvider>
            <DiffWorkspace video={video} revisions={revisions} />
        </PlaybackStoreProvider>
    );
}

function useDiffSide(side: Side, revisions: VideoRevision[]) {
    const searchParams = useSearchParams();
    const revision = revisions.find((r) => String(r.revision) === searchParams.get(side))
        ?? revisions[FALLBACK_INDEX[side]];
    const comments = useRevisionComments(revision);
    const videoRef = useRef<HTMLVideoElement>(null);

    return { revision, comments, videoRef, markerClassName: MARKER[side] };
}

function DiffWorkspace({ video, revisions }: { video: Video, revisions: VideoRevision[] }) {
    const t = useTranslations("revision-diff-view");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);

    const sides = { left: useDiffSide("left", revisions), right: useDiffSide("right", revisions) };
    const primaryRef = sides[PRIMARY].videoRef;
    useDiffSync(primaryRef, sides[COMPARE].videoRef);
    useStartAt(primaryRef, searchParams.get("t"));

    const markers = useMemo(
        () => [
            ...commentMarkers(sides.left.comments, sides.left.markerClassName),
            ...commentMarkers(sides.right.comments, sides.right.markerClassName),
        ],
        [sides.left.comments, sides.right.comments],
    );

    const withParams = (changes: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams);
        for (const [key, value] of Object.entries(changes)) {
            if (value === null) params.delete(key);
            else params.set(key, value);
        }
        return `${pathname}?${params}`;
    };
    const setRevision = (side: Side, revision: string) => router.replace(withParams({ [side]: revision, t: null }));
    // Written straight into history: a router.replace would be dropped by the navigation that follows.
    const rememberPosition = (time: number) => window.history.replaceState(null, "", withParams({ t: String(time) }));

    const seek = (time: number) => { if (primaryRef.current) primaryRef.current.currentTime = time; };
    const selectComment = (comment: VideoComment) => {
        setSelectedCommentId(comment.id);
        seek(comment.time);
    };

    const commentSide = (side: Side) => (
        <CommentSide
            revision={sides[side].revision}
            comments={sides[side].comments}
            markerClassName={sides[side].markerClassName}
            selectedId={selectedCommentId}
            onSelect={selectComment}
            onLeave={rememberPosition}
        />
    );
    const revisionSelect = (side: Side) => (
        <RevisionSelect
            label={t(side === "left" ? "leftRevision" : "rightRevision")}
            revisions={revisions}
            revision={sides[side].revision}
            onChange={(r) => setRevision(side, r)}
        />
    );

    return (
        <div className="flex flex-1 min-w-0 p-3 gap-3">
            {commentSide("left")}
            <div className="flex flex-col flex-1 min-w-0 gap-3">
                <h2 className="px-2 text-lg font-semibold text-primary tracking-wide truncate">{video.title}</h2>
                <div className="flex items-center justify-between gap-3">
                    {revisionSelect("left")}
                    <ModeTabs />
                    {revisionSelect("right")}
                </div>
                <DiffStage
                    left={sides.left.revision}
                    right={sides.right.revision}
                    leftRef={sides.left.videoRef}
                    rightRef={sides.right.videoRef}
                />
                <SeekBar markers={markers} onMarkerClick={seek} />
                <div className="flex items-center gap-3 bg-card rounded-lg px-3 py-2 border">
                    <PlayButton />
                    <VolumeControl />
                    <TimeDisplay />
                    <PlaybackRateSelect />
                </div>
            </div>
            {commentSide("right")}
        </div>
    );
}

// ?t= starts the comparison at a position, e.g. when coming back from the review page.
function useStartAt(primaryRef: RefObject<HTMLVideoElement | null>, param: string | null) {
    useEffect(() => {
        const primary = primaryRef.current;
        const start = parseFloat(param ?? "");
        if (!primary || !Number.isFinite(start)) return;

        const seek = () => { primary.currentTime = start; };
        primary.addEventListener("loadedmetadata", seek, { once: true });
        return () => primary.removeEventListener("loadedmetadata", seek);
    }, []);
}
