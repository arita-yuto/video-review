import fs from "fs";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { spawn } from "child_process";
import { pipeline } from "stream/promises";
import { JobStatus, PrismaClient } from "@prisma/client";
import { DriversFactory } from "@/server/lib/storage/drivers";

const FileDriver = DriversFactory();

type StorageKeyPath = {
    storageKey: string;
    filePath: string;
}


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
    const storageKey = path.join("thumbnails", videoRevId, "thumb.png").replace(/\\/g, "/");
    const tmpPngPath = path.join(os.tmpdir(), "thumb_" + uuidv4() + ".png");

    try {
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
    } catch (e) {
        throw e;
    }
}

export async function generateDownScaled(storageKey: string, tempMoviePath: string, width: number): Promise<StorageKeyPath> {
    const outputFileName = `${path.basename(storageKey, path.extname(storageKey))}_${width}p.mp4`;
    const outputTemp = path.join(os.tmpdir(), outputFileName);
    const scaledStorageKey = path.join(path.dirname(storageKey), outputFileName).replace(/\\/g, "/");

    try {
        await execFFmpeg([
            "-i", tempMoviePath,
            "-vf", `scale=${width}:-2`,
            "-f", "mp4",
            "-movflags", "frag_keyframe+empty_moov",
            outputTemp,
        ]);

        return {
            storageKey: scaledStorageKey,
            filePath: outputTemp
        };
    } catch (e) {
        throw new Error("Failed to download and scale video");
    }
}

async function downloadToTemp(storageKey: string): Promise<string> {
    const tempExt = path.extname(storageKey) || ".mp4";
    const tempPath = path.join(os.tmpdir(), `video-source-${uuidv4()}${tempExt}`);
    const readStream = await FileDriver!.directReadStream(storageKey);

    await pipeline(readStream, fs.createWriteStream(tempPath));
    return tempPath;
}

export async function processVideo(storageKey: string, videoId: string, videoRevId: string): Promise<JobStatus> {
    console.log(`Processing video at path: ${storageKey} for videoId: ${videoId}, videoRevId: ${videoRevId}`);
    const results: StorageKeyPath[] = [];

    let filePath: string | undefined = undefined;
    let status: JobStatus = JobStatus.failed;

    try {
        if(!FileDriver) {
            throw new Error("No file driver configured");
        }

        try {
            await prisma().videoProcessingJob.create({
                data: {
                    videoRevisionId: videoRevId,
                    status: JobStatus.running,
                },
            });
        } catch (e) {
            throw new Error("Failed to create videoProcessingJob record: " + (e as any).message);
        }
        
        try {
            const tempPath = await downloadToTemp(storageKey);
            filePath = tempPath;
        } catch (e) {
            throw new Error("Failed to download video for processing: " + (e as any).message);
        }

        if (!filePath) {
            throw new Error("Failed to obtain file path for processing");
        }

        try {
            const thumb = await generateThumbnail(videoId, filePath);
            results.push(thumb);
        } catch (e) {
            throw new Error("Failed to generate thumbnail: " + (e as any).message);
        }

        try {
            const sourceWidth = await getVideoWidth(filePath);
            for (const width of await resolutionPresets()) {
                if (width > sourceWidth) {
                    console.log(`Skip preset ${width}p because source width is ${sourceWidth}px`);
                    continue;
                }
                const scaled = await generateDownScaled(storageKey, filePath, width);
                results.push(scaled);
            }
        } catch (e) {
            throw new Error("Failed to generate downscaled video: " + (e as any).message);
        }

        for (const result of results) {
            try {
                await FileDriver.directUploadFromFile(result.storageKey, result.filePath);
            } catch (e) {
                throw new Error(`Failed to upload processed file (${result.storageKey}): ` + (e as any).message);
            }
        }

        status = JobStatus.succeeded;
    } finally {
        console.log(`Finished processing video at path: ${storageKey} for videoRevId: ${videoRevId} with status: ${status}`);
        if (filePath) {
            try {
                await fs.promises.unlink(filePath);
            } catch (error: any) {}
        }

        await prisma().videoProcessingJob.update({
            where: { videoRevisionId: videoRevId },
            data: { status },
        });

        return status;
    }
}
