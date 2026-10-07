"use client";

import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

export type CsvImportError = {
    line: number | null;
    column: string | null;
    code: string;
    params?: Record<string, string | number>;
};

export function CsvErrorTable({ errors, describe }: {
    errors: CsvImportError[];
    describe: (error: CsvImportError) => string | null;
}) {
    const t = useTranslations("csv-import");

    return (
        <div className="max-h-80 overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("columns.line")}</TableHead>
                        <TableHead>{t("columns.column")}</TableHead>
                        <TableHead>{t("columns.reason")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {errors.map((error, i) => (
                        <TableRow key={i}>
                            <TableCell>{error.line ?? "-"}</TableCell>
                            <TableCell>{error.column ?? "-"}</TableCell>
                            <TableCell>{describe(error) ?? t(`errors.${error.code}`, error.params)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
