import { createRoute, z } from "@hono/zod-openapi";
import { prisma } from "@/server/lib/db";
import { createRouter } from "@/server/lib/openapi/router";
import { errorResponse } from "@/server/lib/openapi/error-response";
import { authorize } from "@/server/lib/token";
import { CSV_ERROR_CODES, defineCsv, readCsv, validateCsv, type CsvError } from "@/server/lib/csv-import";

const videoCsv = defineCsv({
    id: { schema: z.string(), required: true, unique: true },
    // Kept as written: uploads match the exact strings, so trimming would rename the video.
    folder: { schema: z.string(), required: true, trim: false },
    title: { schema: z.string(), required: true, trim: false },
    // Written by the export so files can be found; the import does not read it.
    files: { schema: z.string() },
});

const VIDEO_ERROR_CODES = ["unknownId", "pairTaken"] as const;

type ImportError = CsvError<typeof CSV_ERROR_CODES[number] | typeof VIDEO_ERROR_CODES[number]>;

const ImportErrorsResponse = z.object({
    errors: z.array(z.object({
        line: z.number().nullable(),
        column: z.string().nullable(),
        code: z.enum([...CSV_ERROR_CODES, ...VIDEO_ERROR_CODES]),
        params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    })),
});

export const videosImportRouter = createRouter()
    .openapi(createRoute({
        method: "post",
        summary: "Move and rename videos from a CSV file",
        description: [
            "Each row names a video by id and gives its folder and title; rows that differ from the current values move or rename that video.",
            "Applies every row or none. On a problem, lists each one with its row (the header is row 1), column and reason.",
            "Uploads that still send the old folder and title create new videos.",
        ].join(" "),
        path: "/",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: z.object({ csv: z.string() }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Every row was applied; updated counts only the videos that changed",
                content: {
                    "application/json": {
                        schema: z.object({ updated: z.number() }),
                    },
                },
            },
            401: errorResponse("Unauthorized"),
            403: errorResponse("Forbidden"),
            422: {
                description: "Nothing was changed",
                content: {
                    "application/json": {
                        schema: ImportErrorsResponse,
                    },
                },
            },
        },
    }), async (c) => {
        await authorize(c.req.raw, ["admin"]);
        const { csv } = c.req.valid("json");

        const { records, errors: readErrors } = readCsv(videoCsv, csv);
        const errors: ImportError[] = [...readErrors, ...validateCsv(videoCsv, records)];

        // Every video counts, unpublished drafts and deleted ones too: an upload matches any of them by folder and title.
        const videos = await prisma.video.findMany({ select: { id: true, folderKey: true, title: true, deleted: true } });
        const videoById = new Map(videos.map(v => [v.id, v]));

        // 1. Each row must name a video that is in the list.
        const knownRows = records.filter(({ cells }) => videoById.get(cells.id)?.deleted === false);
        for (const { line, cells } of records) {
            if (!knownRows.some(row => row.cells.id === cells.id)) {
                errors.push({ line, column: "id", code: "unknownId" });
            }
        }

        // 2. Where each video ends up: the row's folder and title, or where it is now when the file leaves it out.
        const placeOf = (folder: string, title: string) => JSON.stringify([folder, title]);
        const placeAfter = new Map(videos.map(v => [v.id, placeOf(v.folderKey, v.title)]));
        for (const { cells } of knownRows) {
            placeAfter.set(cells.id, placeOf(cells.folder, cells.title));
        }

        // 3. No two videos may end up in the same place, so a swap within the file is fine but a clash is not.
        const videosPerPlace = new Map<string, number>();
        for (const place of placeAfter.values()) {
            videosPerPlace.set(place, (videosPerPlace.get(place) ?? 0) + 1);
        }
        for (const { line, cells } of knownRows) {
            if (videosPerPlace.get(placeOf(cells.folder, cells.title))! > 1) {
                errors.push({ line, column: "title", code: "pairTaken" });
            }
        }

        if (errors.length > 0) {
            errors.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
            return c.json({ errors }, 422);
        }

        const changes = knownRows
            .map(({ cells }) => ({ id: cells.id, folderKey: cells.folder, title: cells.title, before: videoById.get(cells.id)! }))
            .filter(r => r.folderKey !== r.before.folderKey || r.title !== r.before.title);

        await prisma.$transaction(changes.map(r => prisma.video.update({
            where: { id: r.id },
            data: { folderKey: r.folderKey, title: r.title },
        })));

        return c.json({ updated: changes.length }, 200);
    });
