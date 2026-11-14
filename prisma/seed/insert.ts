import type { PrismaClient, User } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

export type VideoData = {
    title: string;
    folderKey: string;
    scenePath?: string;
    vcsWatchPaths?: string[];
    deleted?: boolean;
    // In revision order: the first entry becomes revision 1.
    revisions: {
        filePath: string;
        uploadedAt?: Date;
        tags?: string[];
        summary?: string;
    }[];
};

export type VideoRow = {
    id: string;
    vcsWatchPaths: string[];
    revisions: { id: string; uploadedAt: Date }[];
};

export type CommentData = {
    videoId: string;
    revision: number;
    author: User;
    text: string;
    time: number;
    createdAt: Date;
    issueId?: string;
    drawingPath?: string;
    notifiedProviders?: string[];
};

export type EventData = {
    revisionId: string;
    kind: string;
    startMs: number;
    endMs: number;
    data: string;
    seq?: number;
    contentId?: string;
    links?: { label?: string; url: string }[];
};

export type VcsData = {
    repoName: string;
    vcsConfigId: string;
    revisionId: string;
    rangeFrom: Date;
    rangeTo: Date;
    vcsWatchPaths: string[];
    summary?: string;
    pullRequests: {
        number: number;
        title: string;
        description?: string;
        author: string;
        labels?: string[];
        files: string[];
        mergedAt: Date;
    }[];
    commits: {
        hash: string;
        message: string;
        author: string;
        files: string[];
        committedAt: Date;
    }[];
};

export async function insertUser(prisma: PrismaClient, displayName: string): Promise<User> {
    const email = `${displayName}@example.com`;

    return prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            id: randomUUID(),
            email,
            displayName,
            avatarPath: `/avatars/${displayName}.png`,
            role: "admin",
            identities: {
                create: {
                    id: randomUUID(),
                    provider: "password",
                    providerUid: email,
                    secretHash: await bcrypt.hash("pass123", 10),
                },
            },
        },
    });
}

export async function deleteVideos(prisma: PrismaClient, folderPrefix: string): Promise<void> {
    const videos = await prisma.video.findMany({
        where: { folderKey: { startsWith: folderPrefix } },
        select: { id: true },
    });
    const videoIds = videos.map((video) => video.id);

    const revisions = await prisma.videoRevision.findMany({
        where: { videoId: { in: videoIds } },
        select: { id: true },
    });
    const revisionIds = revisions.map((revision) => revision.id);

    await prisma.vCSRevisionLink.deleteMany({ where: { videoRevisionId: { in: revisionIds } } });
    await prisma.videoEvent.deleteMany({ where: { videoRevisionId: { in: revisionIds } } });
    await prisma.videoComment.deleteMany({ where: { videoId: { in: videoIds } } });
    await prisma.userVideoReadStatus.deleteMany({ where: { videoId: { in: videoIds } } });

    // latestRevision points back at a revision row, so detach it before deleting revisions.
    await prisma.video.updateMany({ where: { id: { in: videoIds } }, data: { latestRevisionNum: null } });
    await prisma.videoRevision.deleteMany({ where: { videoId: { in: videoIds } } });
    await prisma.video.deleteMany({ where: { id: { in: videoIds } } });
}

export async function insertVideos(prisma: PrismaClient, videos: VideoData[]): Promise<VideoRow[]> {
    const insertedAt = new Date();

    const rows = videos.map((video) => {
        return {
            id: randomUUID(),
            vcsWatchPaths: video.vcsWatchPaths ?? [],
            revisions: video.revisions.map((revision) => {
                return { id: randomUUID(), uploadedAt: revision.uploadedAt ?? insertedAt };
            }),
        };
    });

    await prisma.video.createMany({
        data: videos.map((video, videoIndex) => {
            return {
                id: rows[videoIndex].id,
                title: video.title,
                folderKey: video.folderKey,
                scenePath: video.scenePath ?? null,
                vcsWatchPaths: rows[videoIndex].vcsWatchPaths,
                deleted: video.deleted ?? false,
            };
        }),
    });

    await prisma.videoRevision.createMany({
        data: videos.flatMap((video, videoIndex) => {
            return video.revisions.map((revision, revisionIndex) => {
                return {
                    id: rows[videoIndex].revisions[revisionIndex].id,
                    videoId: rows[videoIndex].id,
                    revision: revisionIndex + 1,
                    filePath: revision.filePath,
                    uploadedAt: rows[videoIndex].revisions[revisionIndex].uploadedAt,
                    tags: revision.tags ?? [],
                    summary: revision.summary ?? null,
                };
            });
        }),
    });

    // latestRevision references a revision row, so it can only be set once the revisions exist.
    await prisma.$transaction(rows.map((row) => {
        return prisma.video.update({
            where: { id: row.id },
            data: {
                latestRevisionNum: row.revisions.length,
                latestUpdatedAt: row.revisions[row.revisions.length - 1].uploadedAt,
            },
        });
    }));

    return rows;
}

// Returns the new comment ids in the order of `comments`.
export async function insertComments(prisma: PrismaClient, comments: CommentData[]): Promise<string[]> {
    const ids = comments.map(() => randomUUID());

    await prisma.videoComment.createMany({
        data: comments.map((comment, commentIndex) => {
            return {
                id: ids[commentIndex],
                videoId: comment.videoId,
                videoRevNum: comment.revision,
                userName: comment.author.displayName,
                userEmail: comment.author.email ?? "",
                userId: comment.author.id,
                comment: comment.text,
                time: comment.time,
                createdAt: comment.createdAt,
                issueId: comment.issueId ?? null,
                drawingPath: comment.drawingPath ?? null,
                hasDrawing: Boolean(comment.drawingPath),
                notifiedProviders: comment.notifiedProviders ?? [],
            };
        }),
    });

    return ids;
}

export async function insertReadStatuses(
    prisma: PrismaClient,
    readStatuses: { userId: string; videoId: string; lastReadCommentId: string }[],
): Promise<void> {
    await prisma.userVideoReadStatus.createMany({
        data: readStatuses.map((readStatus) => {
            return { id: randomUUID(), ...readStatus };
        }),
    });
}

export async function insertEvents(prisma: PrismaClient, events: EventData[]): Promise<void> {
    const kindIds = new Map<string, string>();

    for (const label of new Set(events.map((event) => event.kind))) {
        const kind = await prisma.videoEventKind.upsert({
            where: { label },
            update: {},
            create: { id: randomUUID(), label },
        });

        kindIds.set(label, kind.id);
    }

    await prisma.videoEvent.createMany({
        data: events.map((event) => {
            return {
                id: randomUUID(),
                videoRevisionId: event.revisionId,
                kindId: kindIds.get(event.kind)!,
                startMs: event.startMs,
                endMs: event.endMs,
                data: event.data,
                seq: event.seq ?? 0,
                contentId: event.contentId,
                links: event.links ?? [],
            };
        }),
    });
}

export async function deleteVcsCache(prisma: PrismaClient, repoName: string): Promise<void> {
    await prisma.vCSCachedMerge.deleteMany({ where: { repoName } });
    await prisma.vCSCachedCommit.deleteMany({ where: { repoName } });
}

// Returns the id of the config labelled `label`, creating it on the first run.
export async function insertVcsConfig(prisma: PrismaClient, label: string): Promise<string> {
    const existing = await prisma.vCSConfig.findFirst({ where: { label } });

    if (existing) {
        return existing.id;
    }

    const created = await prisma.vCSConfig.create({
        data: { label, provider: "github", config: {}, branch: "main" },
    });

    return created.id;
}

// Mirrors scoreRelevance() in src/server/lib/vcs/relevance.ts closely enough for fixture data:
// a file under a watched directory is "high", anything else is "unlikely".
function relevance(files: string[], vcsWatchPaths: string[]): { relevance: string; relevanceReason: string } {
    if (vcsWatchPaths.length === 0) {
        return { relevance: "high", relevanceReason: "no filter configured" };
    }

    const matched = files.find((file) => vcsWatchPaths.some((watchPath) => {
        return file === watchPath || file.startsWith(watchPath.replace(/\/$/, "") + "/");
    }));

    return matched
        ? { relevance: "high", relevanceReason: `vcsWatchPaths match: ${matched}` }
        : { relevance: "unlikely", relevanceReason: "no vcsWatchPaths match" };
}

// Writes one revision's code changes as if they had been fetched from the repository.
export async function insertVcs(prisma: PrismaClient, vcs: VcsData): Promise<void> {
    const fetchedAt = new Date();

    const merges = vcs.pullRequests.map((pullRequest) => {
        return {
            id: randomUUID(),
            externalId: String(pullRequest.number),
            repoName: vcs.repoName,
            title: pullRequest.title,
            description: pullRequest.description ?? null,
            author: pullRequest.author,
            mergedAt: pullRequest.mergedAt,
            url: `https://example.com/${vcs.repoName}/pull/${pullRequest.number}`,
            labels: pullRequest.labels ?? [],
            files: pullRequest.files,
            filesFetchedAt: fetchedAt,
        };
    });

    const commits = vcs.commits.map((commit) => {
        return {
            id: randomUUID(),
            hash: commit.hash,
            repoName: vcs.repoName,
            shortHash: commit.hash.slice(0, 7),
            message: commit.message,
            author: commit.author,
            committedAt: commit.committedAt,
            url: `https://example.com/${vcs.repoName}/commit/${commit.hash}`,
            files: commit.files,
            filesFetchedAt: fetchedAt,
        };
    });

    await prisma.vCSCachedMerge.createMany({ data: merges });
    await prisma.vCSCachedCommit.createMany({ data: commits });

    await prisma.vCSRevisionLink.create({
        data: {
            id: randomUUID(),
            videoRevisionId: vcs.revisionId,
            vcsConfigId: vcs.vcsConfigId,
            rangeFrom: vcs.rangeFrom,
            rangeTo: vcs.rangeTo,
            fetchedAt,
            summary: vcs.summary ?? null,
            mergeResults: merges.map((merge) => {
                return { cachedMergeId: merge.id, ...relevance(merge.files, vcs.vcsWatchPaths) };
            }),
            commitResults: commits.map((commit) => {
                return { cachedCommitId: commit.id, ...relevance(commit.files, vcs.vcsWatchPaths) };
            }),
        },
    });
}
