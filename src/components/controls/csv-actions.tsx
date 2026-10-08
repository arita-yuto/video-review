"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { readError } from "@/lib/api-client";
import { Button } from "@/ui/button";
import { CsvImportDialog } from "@/components/controls/csv-import-dialog";

type CsvResponse = { status: number; json: () => Promise<unknown>; blob: () => Promise<Blob> };

// The texts live under `admin-settings.<kind>.export` and `admin-settings.<kind>.import`.
export function CsvActions({ kind, exportCsv, importCsv, onImported }: {
    kind: "users" | "videos";
    exportCsv: () => Promise<CsvResponse>;
    importCsv: (csv: string) => Promise<CsvResponse>;
    onImported: () => void;
}) {
    const t = useTranslations("admin-settings");
    const [importing, setImporting] = useState(false);

    async function onExport() {
        try {
            const res = await exportCsv();
            if (res.status !== 200) {
                throw new Error(await readError(res));
            }

            const url = URL.createObjectURL(await res.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = `${kind}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            toast.error(`${t(`${kind}.export.failed`)}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    return (
        <>
            <Button type="button" variant="outline" size="sm" onClick={() => void onExport()}>
                <Download />
                {t(`${kind}.export.open`)}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setImporting(true)}>
                <Upload />
                {t(`${kind}.import.open`)}
            </Button>

            {importing && (
                <CsvImportDialog
                    messages={`${kind}.import`}
                    send={importCsv}
                    onImported={onImported}
                    onClose={() => setImporting(false)}
                />
            )}
        </>
    );
}
