import "server-only";

// Every format the server stores, with the signature and Content-Type that go with it.
export enum FileFormat {
    Png = "png",
    Jpeg = "jpeg",
    Mp4 = "mp4",
}

type Signature = { offset: number; bytes: number[] };

export type FileKind = "image" | "video";

type Format = { kind: FileKind; contentType: string; extensions: string[]; signatures: Signature[] };

const FORMATS: Record<FileFormat, Format> = {
    [FileFormat.Png]: {
        kind: "image",
        contentType: "image/png",
        extensions: [".png"],
        signatures: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
    },
    [FileFormat.Jpeg]: {
        kind: "image",
        contentType: "image/jpeg",
        extensions: [".jpg", ".jpeg"],
        signatures: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
    },
    [FileFormat.Mp4]: {
        kind: "video",
        contentType: "video/mp4",
        extensions: [".mp4"],
        // ISO BMFF puts the box size first, so "ftyp" sits at byte 4.
        signatures: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],
    },
};

export const isFormat = (format: FileFormat, bytes: Buffer) =>
    FORMATS[format].signatures.some(({ offset, bytes: magic }) =>
        bytes.subarray(offset, offset + magic.length).equals(Buffer.from(magic)));

export const kindOf = (format: FileFormat) => FORMATS[format].kind;

export const contentTypeOf = (format: FileFormat) => FORMATS[format].contentType;

export const formatOfExtension = (extension: string) =>
    Object.values(FileFormat).find(f => FORMATS[f].extensions.includes(extension.toLowerCase()));
