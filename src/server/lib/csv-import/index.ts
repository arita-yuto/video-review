import "server-only";
import { parse } from "csv-parse/sync";
import { z } from "@hono/zod-openapi";

export const CSV_ERROR_CODES = [
    "notUtf8",
    "malformed",
    "unknownColumn",
    "duplicateColumn",
    "missingColumn",
    "cellCount",
    "required",
    "duplicateInFile",
    "tooShort",
    "tooLong",
    "notOneOf",
    "invalid",
] as const;

export type CsvError<Code extends string = typeof CSV_ERROR_CODES[number]> = {
    line: number | null;
    column: string | null;
    code: Code;
    params?: Record<string, string | number>;
};

export type CsvColumn = {
    schema: z.ZodType;
    required?: boolean;
    unique?: boolean;
    default?: string;
    trim?: boolean;
};

type Columns = Record<string, CsvColumn>;

export type CsvRecord<C extends Columns> = {
    line: number;
    cells: { [K in keyof C]: string };
};

type CsvValue<Column extends CsvColumn> = Column extends { required: true } | { default: string }
    ? z.output<Column["schema"]>
    : z.output<Column["schema"]> | undefined;

export type CsvValues<C extends Columns> = { [K in keyof C]: CsvValue<C[K]> };

export const defineCsv = <const C extends Columns>(columns: C) => columns;

export function readCsv<C extends Columns>(columns: C, csv: string): { records: CsvRecord<C>[]; errors: CsvError[] } {
    // The browser and the CLI both decode the file as UTF-8, so a file saved in a legacy
    // encoding (Shift_JIS, CP949) arrives with replacement characters in place of its text.
    if (csv.includes("�")) {
        return { records: [], errors: [{ line: null, column: null, code: "notUtf8" }] };
    }

    let rows: string[][];
    try {
        rows = parse(csv, { bom: true, relax_column_count: true, record_delimiter: ["\r\n", "\n"] });
    } catch {
        // The parser counts physical lines, which drift from row numbers once a cell holds a line break.
        return { records: [], errors: [{ line: null, column: null, code: "malformed" }] };
    }

    const header = (rows[0] ?? []).map(cell => cell.trim());
    // Excel can save columns with no name and nothing in them. Only those are skipped:
    // an unnamed column that holds data is still reported, so no value is dropped silently.
    const errors = checkHeader(columns, header.filter((name, at) =>
        name !== "" || rows.slice(1).some(row => (row[at] ?? "").trim() !== "")));
    if (errors.length > 0) {
        return { records: [], errors };
    }

    const records: CsvRecord<C>[] = [];

    rows.slice(1).forEach((row, index) => {
        const line = index + 2;

        // A blank row still counts toward the numbering, so later rows keep the spreadsheet's number.
        if (row.every(cell => cell.trim() === "")) return;

        if (row.length !== header.length) {
            errors.push({ line, column: null, code: "cellCount" });
            return;
        }

        const cells: Record<string, string> = {};
        for (const [name, column] of Object.entries(columns)) {
            const at = header.indexOf(name);
            const cell = at < 0 ? "" : row[at];
            cells[name] = column.trim === false ? cell : cell.trim();
        }
        records.push({ line, cells: cells as CsvRecord<C>["cells"] });
    });

    return { records, errors };
}

export function validateCsv<C extends Columns>(columns: C, records: CsvRecord<C>[]): CsvError[] {
    const errors: CsvError[] = [];

    for (const [name, column] of Object.entries(columns)) {
        const firstLineOf = new Map<string, number>();

        for (const { line, cells } of records) {
            const cell = cells[name];

            if (cell.trim() === "") {
                if (column.required) errors.push({ line, column: name, code: "required" });
                continue;
            }

            const parsed = column.schema.safeParse(cell);
            if (!parsed.success) {
                const [code, params] = describeIssue(parsed.error.issues[0]);
                errors.push({ line, column: name, code, ...(params ? { params } : {}) });
            }

            if (column.unique) {
                const otherLine = firstLineOf.get(cell);
                if (otherLine === undefined) firstLineOf.set(cell, line);
                else errors.push({ line, column: name, code: "duplicateInFile", params: { otherLine } });
            }
        }
    }

    return errors;
}

export function csvValues<C extends Columns>(columns: C, record: CsvRecord<C>): CsvValues<C> {
    const values: Record<string, unknown> = {};

    for (const [name, column] of Object.entries(columns)) {
        const cell = record.cells[name];
        const source = cell.trim() === "" ? column.default : cell;
        values[name] = source === undefined ? undefined : column.schema.parse(source);
    }

    return values as CsvValues<C>;
}

function checkHeader(columns: Columns, header: string[]): CsvError[] {
    const errors: CsvError[] = [];

    header.forEach((name, index) => {
        if (!Object.hasOwn(columns, name)) {
            errors.push({ line: 1, column: name, code: "unknownColumn" });
        } else if (header.indexOf(name) !== index) {
            errors.push({ line: 1, column: name, code: "duplicateColumn" });
        }
    });

    for (const [name, column] of Object.entries(columns)) {
        if (column.required && !header.includes(name)) {
            errors.push({ line: 1, column: name, code: "missingColumn" });
        }
    }

    return errors;
}

function describeIssue(issue: z.core.$ZodIssue): [CsvError["code"], CsvError["params"]?] {
    switch (issue.code) {
        case "too_small":
            return ["tooShort", { min: Number(issue.minimum) }];
        case "too_big":
            return ["tooLong", { max: Number(issue.maximum) }];
        case "invalid_value":
            return ["notOneOf", { values: issue.values.join(", ") }];
        default:
            return ["invalid"];
    }
}
