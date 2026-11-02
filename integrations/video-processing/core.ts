import fs from "fs";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { spawn } from "child_process";
import { pipeline } from "stream/promises";
import { JobStatus, PrismaClient, ProcessingStepKind, type VideoProcessingStep, type VideoRevision } from "@prisma/client";
import { DriversFactory } from "@/server/lib/storage/drivers";
import { thumbnailKey, downscaledVideoKey } from "@/lib/storage-key";

const FileDriver = DriversFactory();

type StorageKeyPath = {
    storageKey: string;
    filePath: string;
}

export type StepSource = {
    storageKey: string;
    videoId: string;
    videoRevId: string;
    path: string;
};

let prismaInstance: PrismaClient | undefined = undefined;

export const prisma = () => {
    if (!prismaInstance) {
        prismaInstance = new PrismaClient();
    }
    return prismaInstance;
}

// The presets saved on the admin screen (General) win; env is the fallback for setups configured
// without it. Read per job so a change applies to the next job without a restart.
async function resolutionPresets(): Promise<number[]> {
    const row = await prisma().systemSetting.findUnique({ where: { key: "general.resolutionPresets" } });
    const presets = typeof row?.value === "string" ? row.value : process.env.NEXT_PUBLIC_VIDEO_REVIEW_RESOLUTION_PRESETS ?? "";
    return presets.split(",").map(preset => preset.trim()).filter(Boolean).map(preset => {
        const width = parseInt(preset);
        if (isNaN(width)) {
            throw new Error(`Invalid resolution preset: ${preset}`);
        }
        return width;
    });
}

function execFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn("ffmpeg", args, {
            stdio: ["ignore", "ignore", "pipe"],
        });

        let stderr = "";
        proc.stderr.on("data", (data) => (stderr += data.toString()));

        proc.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`ffmpeg failed: ${stderr}`));
        });

        proc.on("error", reject);
    });
}

function getVideoWidth(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const args = [
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width",
            "-of", "csv=p=0",
            filePath,
        ];

        const proc = spawn("ffprobe", args, {
            stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (data) => (stdout += data.toString()));
        proc.stderr.on("data", (data) => (stderr += data.toString()));

        proc.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`ffprobe failed: ${stderr}`));
                return;
            }

            const width = parseInt(stdout.trim(), 10);
            if (isNaN(width) || width <= 0) {
                reject(new Error(`Invalid video width from ffprobe: ${stdout}`));
                return;
            }
            resolve(width);
        });

        proc.on("error", reject);
    });
}

export async function generateThumbnail(videoRevId: string, tempMoviePath: string): Promise<StorageKeyPath> {
    const storageKey = thumbnailKey(videoRevId);
    const tmpPngPath = path.join(os.tmpdir(), "thumb_" + uuidv4() + ".png");

    await execFFmpeg([
        "-y",
        "-ss", "1",
        "-i", tempMoviePath,
        "-frames:v", "1",
        "-vf", "scale=480:-1",
        tmpPngPath
    ]);

    return {
        storageKey,
        filePath: tmpPngPath
    };
}

export async function generateDownScaled(storageKey: string, tempMoviePath: string, width: number): Promise<StorageKeyPath> {
    const scaledStorageKey = downscaledVideoKey(storageKey, width);
    const outputTemp = path.join(os.tmpdir(), path.basename(scaledStorageKey));

    await execFFmpeg([
        "-i", tempMoviePath,
        "-vf", `scale=${width}:-2`,
        // Emit 8-bit 4:2:0 explicitly for broad browser and device compatibility.
        "-pix_fmt", "yuv420p",
        "-f", "mp4",
        "-movflags", "frag_keyframe+empty_moov",
        outputTemp,
    ]);

    return {
        storageKey: scaledStorageKey,
        filePath: outputTemp
    };
}

async function downloadToTemp(storageKey: string): Promise<string> {
    const tempExt = path.extname(storageKey) || ".mp4";
    const tempPath = path.join(os.tmpdir(), `video-source-${uuidv4()}${tempExt}`);
    const readStream = await FileDriver!.directReadStream(storageKey);

    await pipeline(readStream, fs.createWriteStream(tempPath));
    return tempPath;
}

async function moveToStorage(file: StorageKeyPath): Promise<void> {
    try {
        await FileDriver!.directUploadFromFile(file.storageKey, file.filePath);
    } finally {
        await fs.promises.rm(file.filePath, { force: true });
    }
}

// The steps a new revision gets, in the order they run.
export const NEW_REVISION_STEP_KINDS: ProcessingStepKind[] = [ProcessingStepKind.thumbnail, ProcessingStepKind.downscaled];

const runners: Record<ProcessingStepKind, (source: StepSource) => Promise<void>> = {
    thumbnail: async (source) => {
        await moveToStorage(await generateThumbnail(source.videoId, source.path));
    },
    downscaled: async (source) => {
        const sourceWidth = await getVideoWidth(source.path);
        for (const width of await resolutionPresets()) {
            if (width > sourceWidth) {
                console.log(`Skip preset ${width}p because source width is ${sourceWidth}px`);
                continue;
            }
            await moveToStorage(await generateDownScaled(source.storageKey, source.path, width));
        }
    },
    filmstrip: async () => {
        throw new Error("This worker does not produce filmstrips");
    },
};

async function runStep(step: Pick<VideoProcessingStep, "id" | "kind">, source: StepSource): Promise<JobStatus> {
    await prisma().videoProcessingStep.update({
        where: { id: step.id },
        data: { status: JobStatus.running, error: null },
    });

    try {
        await runners[step.kind](source);
        await prisma().videoProcessingStep.update({
            where: { id: step.id },
            data: { status: JobStatus.succeeded },
        });
        return JobStatus.succeeded;
    } catch (e) {
        console.error(`Step ${step.kind} failed for videoRevId ${source.videoRevId}:`, e);
        // Operators read error before deciding on a redo.
        await prisma().videoProcessingStep.update({
            where: { id: step.id },
            data: { status: JobStatus.failed, error: (e as any).message },
        });
        return JobStatus.failed;
    }
}

// Only a failed step fails the job; skipped and still-pending steps count as done.
async function summarizeJob(jobId: string): Promise<JobStatus> {
    const steps = await prisma().videoProcessingStep.findMany({ where: { jobId }, select: { status: true } });
    const status = steps.some((step) => step.status === JobStatus.failed) ? JobStatus.failed : JobStatus.succeeded;
    await prisma().videoProcessingJob.update({ where: { id: jobId }, data: { status } });
    return status;
}

async function withSource<T>(storageKey: string, work: (sourcePath: string) => Promise<T>): Promise<T> {
    const sourcePath = await downloadToTemp(storageKey);
    try {
        return await work(sourcePath);
    } finally {
        await fs.promises.rm(sourcePath, { force: true });
    }
}

export async function processVideo(storageKey: string, videoId: string, videoRevId: string): Promise<JobStatus> {
    console.log(`Processing video at path: ${storageKey} for videoId: ${videoId}, videoRevId: ${videoRevId}`);
    if (!FileDriver) {
        throw new Error("No file driver configured");
    }

    const job = await prisma().videoProcessingJob.create({
        data: {
            videoRevisionId: videoRevId,
            status: JobStatus.running,
            steps: { create: NEW_REVISION_STEP_KINDS.map((kind) => ({ kind })) },
        },
        include: { steps: true },
    });

    let status: JobStatus;
    try {
        status = await withSource(storageKey, async (sourcePath) => {
            const source: StepSource = { storageKey, videoId, videoRevId, path: sourcePath };
            // The nested create returns the steps in no fixed order, so run them in the declared order.
            for (const kind of NEW_REVISION_STEP_KINDS) {
                await runStep(job.steps.find((step) => step.kind === kind)!, source);
            }
            return summarizeJob(job.id);
        });
    } catch (e) {
        console.error(`Failed to process videoRevId ${videoRevId}:`, e);
        // Steps still pending never ran; record the reason so the job does not stay running.
        await prisma().videoProcessingStep.updateMany({
            where: { jobId: job.id, status: JobStatus.pending },
            data: { status: JobStatus.failed, error: (e as any).message },
        });
        status = await summarizeJob(job.id);
    }

    console.log(`Finished processing video at path: ${storageKey} for videoRevId: ${videoRevId} with status: ${status}`);
    return status;
}

export type PendingStep = VideoProcessingStep & {
    job: { id: string; videoRevision: Pick<VideoRevision, "id" | "videoId" | "filePath"> };
};

// Runs one step without touching the others in its job.
export async function processStep(step: PendingStep): Promise<JobStatus> {
    const { id: videoRevId, videoId, filePath: storageKey } = step.job.videoRevision;
    console.log(`Processing step ${step.kind} for videoRevId: ${videoRevId}`);
    if (!FileDriver) {
        throw new Error("No file driver configured");
    }

    try {
        await withSource(storageKey, async (sourcePath) => {
            await runStep(step, { storageKey, videoId, videoRevId, path: sourcePath });
        });
    } catch (e) {
        console.error(`Failed to process step ${step.kind} for videoRevId ${videoRevId}:`, e);
        await prisma().videoProcessingStep.update({
            where: { id: step.id },
            data: { status: JobStatus.failed, error: (e as any).message },
        });
    }

    return summarizeJob(step.job.id);
}
