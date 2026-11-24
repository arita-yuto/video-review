import fs from "fs";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { spawn } from "child_process";
import { pipeline } from "stream/promises";
import { JobStatus, Prisma, PrismaClient, ProcessingStepKind, type VideoProcessingStep, type VideoRevision } from "@prisma/client";
import { DriversFactory } from "@/server/lib/storage/drivers";
import { thumbnailKey, downscaledVideoKey, filmstripKey } from "@/lib/storage-key";
import { FILMSTRIP_COLS, FILMSTRIP_TILE_WIDTH, filmstripInterval, type Filmstrip } from "@/lib/filmstrip";

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

function execFFprobe(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = spawn("ffprobe", ["-v", "error", ...args], {
            stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (data) => (stdout += data.toString()));
        proc.stderr.on("data", (data) => (stderr += data.toString()));

        proc.on("close", (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`ffprobe failed: ${stderr}`));
            }
        });

        proc.on("error", reject);
    });
}

async function probeDimensions(filePath: string): Promise<{ width: number; height: number }> {
    const out = await execFFprobe(["-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", filePath]);
    const stream = JSON.parse(out).streams?.[0];
    const width = Number(stream?.width);
    const height = Number(stream?.height);
    if (!(width > 0) || !(height > 0)) {
        throw new Error(`Invalid dimensions from ffprobe: ${out}`);
    }
    return { width, height };
}

// Some containers (fragmented MP4) report no format duration; the video stream usually still does.
async function probeDuration(filePath: string): Promise<number> {
    const out = await execFFprobe(["-select_streams", "v:0", "-show_entries", "format=duration:stream=duration", "-of", "json", filePath]);
    const parsed = JSON.parse(out);
    const duration = Number(parsed.format?.duration) || Number(parsed.streams?.[0]?.duration);
    if (!(duration > 0)) {
        throw new Error(`Invalid duration from ffprobe: ${out}`);
    }
    return duration;
}

type FilmstripSheetFiles = { dir: string; files: StorageKeyPath[]; filmstrip: Filmstrip };

async function generateFilmstrip(storageKey: string, tempMoviePath: string): Promise<FilmstripSheetFiles> {
    const interval = filmstripInterval(await probeDuration(tempMoviePath));
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "filmstrip-"));

    try {
        // Single frames first, so the count and the tile size come from real files.
        await execFFmpeg([
            "-y",
            "-i", tempMoviePath,
            "-vf", `fps=1/${interval},scale=${FILMSTRIP_TILE_WIDTH}:-2`,
            path.join(dir, "frame_%05d.png"),
        ]);

        const frames = (await fs.promises.readdir(dir)).filter((name) => name.startsWith("frame_")).sort();
        if (frames.length === 0) {
            throw new Error("ffmpeg produced no frames");
        }
        const { width: tileWidth, height: tileHeight } = await probeDimensions(path.join(dir, frames[0]));

        await execFFmpeg([
            "-y",
            "-i", path.join(dir, "frame_%05d.png"),
            "-vf", `tile=${FILMSTRIP_COLS}x${FILMSTRIP_COLS}`,
            "-q:v", "4",
            "-start_number", "0",
            path.join(dir, "sheet_%03d.jpg"),
        ]);

        const sheets = (await fs.promises.readdir(dir)).filter((name) => name.startsWith("sheet_")).sort();
        const files = sheets.map((name, sheet) => ({ storageKey: filmstripKey(storageKey, sheet), filePath: path.join(dir, name) }));

        return { dir, files, filmstrip: { interval, tileWidth, tileHeight, count: frames.length } };
    } catch (e) {
        await fs.promises.rm(dir, { recursive: true, force: true });
        throw e;
    }
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

export async function generateDownScaled(storageKey: string, tempMoviePath: string, widths: number[]): Promise<StorageKeyPath[]> {
    const outputs = widths.map((width) => {
        const scaledStorageKey = downscaledVideoKey(storageKey, width);

        return { width, storageKey: scaledStorageKey, filePath: path.join(os.tmpdir(), `${uuidv4()}_${path.basename(scaledStorageKey)}`) };
    });

    // Decoder and encoders split half of the CPU threads, to leave room for other work on the host.
    // At least 2 each, even when that exceeds the half: with 1 each the run does not spread across CPU threads.
    const threads = String(Math.max(2, Math.floor(os.availableParallelism() / 2 / (widths.length + 1))));

    // The outputs share one run so the source is decoded once; an output option applies to the next output only.
    const outputArgs = outputs.flatMap((output) => [
        "-vf", `scale=${output.width}:-2`,
        // Emit 8-bit 4:2:0 explicitly for broad browser and device compatibility.
        "-pix_fmt", "yuv420p",
        "-threads", threads,
        "-f", "mp4",
        // The index goes at the front, so a browser can start before it has read the whole file.
        "-movflags", "+faststart",
        output.filePath,
    ]);

    try {
        await execFFmpeg([
            "-y",
            "-threads", threads,
            "-i", tempMoviePath,
            ...outputArgs,
        ]);
    } catch (e) {
        for (const output of outputs) {
            await fs.promises.rm(output.filePath, { force: true });
        }

        throw e;
    }

    return outputs;
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
export const NEW_REVISION_STEP_KINDS: ProcessingStepKind[] = [ProcessingStepKind.thumbnail, ProcessingStepKind.downscaled, ProcessingStepKind.filmstrip];

const runners: Record<ProcessingStepKind, (source: StepSource) => Promise<void>> = {
    thumbnail: async (source) => {
        await moveToStorage(await generateThumbnail(source.videoId, source.path));
    },
    downscaled: async (source) => {
        const { width: sourceWidth } = await probeDimensions(source.path);
        const widths: number[] = [];

        // A preset listed twice would name the same output twice.
        for (const width of new Set(await resolutionPresets())) {
            if (width > sourceWidth) {
                console.log(`Skip preset ${width}p because source width is ${sourceWidth}px`);
                continue;
            }

            widths.push(width);
        }

        if (widths.length === 0) {
            return;
        }

        const files = await generateDownScaled(source.storageKey, source.path, widths);

        try {
            for (const file of files) {
                await moveToStorage(file);
            }
        } finally {
            // moveToStorage removes only the file it uploaded.
            for (const file of files) {
                await fs.promises.rm(file.filePath, { force: true });
            }
        }
    },
    filmstrip: async (source) => {
        const sheets = await generateFilmstrip(source.storageKey, source.path);
        try {
            for (const file of sheets.files) {
                await moveToStorage(file);
            }
        } finally {
            await fs.promises.rm(sheets.dir, { recursive: true, force: true });
        }
        await prisma().videoRevision.update({
            where: { id: source.videoRevId },
            data: { filmstrip: sheets.filmstrip },
        });
    },
};

let stopRequested = false;

export function requestStop(): void {
    stopRequested = true;
}

export function isStopRequested(): boolean {
    return stopRequested;
}

function availableStepFilter(): Prisma.VideoProcessingStepWhereInput {
    // keepStepAlive renews updatedAt every minute, so a step running this long has no live worker.
    const staleBefore = new Date(Date.now() - 5 * 60_000);

    return {
        OR: [
            { status: JobStatus.pending },
            { status: JobStatus.running, updatedAt: { lt: staleBefore } },
        ],
    };
}

async function takeStep(stepId: string): Promise<boolean> {
    // Only the worker whose update changes the row takes the step.
    const { count } = await prisma().videoProcessingStep.updateMany({
        where: { id: stepId, ...availableStepFilter() },
        data: { status: JobStatus.running, error: null },
    });

    return count === 1;
}

async function keepStepAlive<T>(stepId: string, work: () => Promise<T>): Promise<T> {
    const intervalMs = 60_000;

    const timer = setInterval(() => {
        prisma().videoProcessingStep.update({ where: { id: stepId }, data: { updatedAt: new Date() } }).catch((e) => {
            console.error(`Failed to renew updatedAt of step ${stepId}:`, e);
        });
    }, intervalMs);

    try {
        return await work();
    } finally {
        clearInterval(timer);
    }
}

async function failStep(stepId: string, error: unknown): Promise<JobStatus> {
    // A failure during stop is the interruption itself, and a failed step is not taken again.
    if (isStopRequested()) {
        await prisma().videoProcessingStep.update({
            where: { id: stepId },
            data: { status: JobStatus.pending, error: null },
        });

        return JobStatus.pending;
    }

    // Operators read error before deciding on a redo.
    await prisma().videoProcessingStep.update({
        where: { id: stepId },
        data: { status: JobStatus.failed, error: (error as any).message },
    });

    return JobStatus.failed;
}

async function runStep(step: Pick<VideoProcessingStep, "id" | "kind">, source: StepSource): Promise<JobStatus> {
    try {
        await runners[step.kind](source);
        await prisma().videoProcessingStep.update({
            where: { id: step.id },
            data: { status: JobStatus.succeeded },
        });
        return JobStatus.succeeded;
    } catch (e) {
        console.error(`Step ${step.kind} failed for videoRevId ${source.videoRevId}:`, e);
        return failStep(step.id, e);
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

// Null means another worker took this upload first; pending means stop interrupted it.
export async function processVideo(storageKey: string, videoId: string, videoRevId: string): Promise<JobStatus | null> {
    if (!FileDriver) {
        throw new Error("No file driver configured");
    }

    // A revision has one job, so the worker whose create goes through is the one that takes the upload.
    const job = await prisma().videoProcessingJob.create({
        data: {
            videoRevisionId: videoRevId,
            status: JobStatus.running,
            steps: { create: NEW_REVISION_STEP_KINDS.map((kind) => ({ kind })) },
        },
        include: { steps: true },
    }).catch((e) => {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            return null;
        }

        throw e;
    });

    if (!job) {
        return null;
    }

    console.log(`Processing video at path: ${storageKey} for videoId: ${videoId}, videoRevId: ${videoRevId}`);

    let status: JobStatus;
    try {
        status = await withSource(storageKey, async (sourcePath) => {
            const source: StepSource = { storageKey, videoId, videoRevId, path: sourcePath };
            let interrupted = false;

            // The nested create returns the steps in no fixed order, so run them in the declared order.
            for (const kind of NEW_REVISION_STEP_KINDS) {
                if (isStopRequested()) {
                    interrupted = true;
                    break;
                }

                const step = job.steps.find((step) => step.kind === kind)!;

                // Another worker may have taken the step during the download.
                if (!(await takeStep(step.id))) {
                    continue;
                }

                if ((await keepStepAlive(step.id, () => runStep(step, source))) === JobStatus.pending) {
                    interrupted = true;
                }
            }

            const summary = await summarizeJob(job.id);

            // The steps left pending are for the next worker, so the upload is not reported as done.
            return interrupted ? JobStatus.pending : summary;
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

export type TakenStep = VideoProcessingStep & {
    job: { id: string; videoRevision: Pick<VideoRevision, "id" | "videoId" | "filePath"> };
};

export async function takeNextStep(): Promise<TakenStep | null> {
    // Checked before taking, so a step is not left running by a worker that cannot process it.
    if (!FileDriver) {
        throw new Error("No file driver configured");
    }

    while (true) {
        const step = await prisma().videoProcessingStep.findFirst({
            where: {
                ...availableStepFilter(),
                job: {
                    videoRevision: { deleted: false, video: { deleted: false } },
                },
            },
            // Recently updated videos first, as they are the likeliest to be under review.
            orderBy: [
                { job: { videoRevision: { video: { latestUpdatedAt: "desc" } } } },
                { job: { videoRevision: { uploadedAt: "desc" } } },
            ],
            include: {
                job: {
                    select: {
                        id: true,
                        videoRevision: { select: { id: true, videoId: true, filePath: true } },
                    },
                },
            },
        });

        if (!step) {
            return null;
        }

        // A step another worker took in between is skipped, and the search runs again.
        if (await takeStep(step.id)) {
            return step;
        }
    }
}

// Runs one step without touching the others in its job.
export async function processStep(step: TakenStep): Promise<JobStatus> {
    const { id: videoRevId, videoId, filePath: storageKey } = step.job.videoRevision;
    console.log(`Processing step ${step.kind} for videoRevId: ${videoRevId}`);

    let status: JobStatus;

    try {
        // The download counts as processing: the step is already running here.
        status = await keepStepAlive(step.id, () => {
            return withSource(storageKey, (sourcePath) => runStep(step, { storageKey, videoId, videoRevId, path: sourcePath }));
        });
    } catch (e) {
        console.error(`Failed to process step ${step.kind} for videoRevId ${videoRevId}:`, e);
        status = await failStep(step.id, e);
    }

    await summarizeJob(step.job.id);

    return status;
}

async function findUnprocessedVideoRevision(): Promise<VideoRevision | null> {
    return prisma().videoRevision.findFirst({
        where: {
            deleted: false,
            video: { deleted: false },
            processingJob: null,
        },
        orderBy: [{ uploadedAt: "asc" }],
    });
}

// Null means there was nothing to take; pending means stop interrupted the work.
export async function processNext(): Promise<JobStatus | null> {
    while (!isStopRequested()) {
        // New uploads go first, so they do not wait behind steps queued for a redo.
        const videoRev = await findUnprocessedVideoRevision();

        if (!videoRev) {
            const step = await takeNextStep();

            return step ? processStep(step) : null;
        }

        const status = await processVideo(videoRev.filePath, videoRev.videoId, videoRev.id);

        if (status !== null) {
            return status;
        }
    }

    return null;
}
