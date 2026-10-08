"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { readError } from "@/lib/api-client";
import { FormDialog } from "@/components/dialog/form-dialog";
import { FilePicker } from "@/components/controls/file-picker";
import { CsvErrorTable, type CsvImportError } from "@/components/controls/csv-error-table";

type ImportResponse = { status: number; json: () => Promise<unknown> };

// The texts live under `admin-settings.<messages>`: title, file, submit, cancel, failed, done,
// and errors.<code> for the reasons the route adds to the shared CSV ones.
export function CsvImportDialog({ messages, send, onImported, onClose }: {
    messages: "users.import" | "videos.import";
    send: (csv: string) => Promise<ImportResponse>;
    onImported: () => void;
    onClose: () => void;
}) {
    const t = useTranslations("admin-settings");

    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [errors, setErrors] = useState<CsvImportError[]>([]);
    const [failure, setFailure] = useState<string | null>(null);

    async function onSubmit() {
        if (!file) {
            return;
        }

        setImporting(true);
        setErrors([]);
        setFailure(null);

        try {
            const res = await send(await file.text());
            if (res.status === 422) {
                setErrors(((await res.json()) as { errors: CsvImportError[] }).errors);
                return;
            }
            if (res.status !== 200) {
                throw new Error(await readError(res));
            }

            toast.success(t(`${messages}.done`, (await res.json()) as Record<string, number>));
            onImported();
            onClose();
        } catch (e) {
            setFailure(`${t(`${messages}.failed`)}: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setImporting(false);
        }
    }

    return (
        <FormDialog
            open
            onClose={onClose}
            title={t(`${messages}.title`)}
            onSubmit={onSubmit}
            submitLabel={t(`${messages}.submit`)}
            cancelLabel={t(`${messages}.cancel`)}
            submitDisabled={!file || importing}
            cancelDisabled={importing}
            message={failure ?? undefined}
        >
            <FilePicker
                accept=".csv,text/csv"
                file={file}
                placeholder={t(`${messages}.file`)}
                onChange={(picked) => {
                    setFile(picked);
                    setErrors([]);
                }}
            />

            {errors.length > 0 && (
                <CsvErrorTable
                    errors={errors}
                    describe={(error) => {
                        const key = `${messages}.errors.${error.code}` as const;
                        return t.has(key) ? t(key) : null;
                    }}
                />
            )}
        </FormDialog>
    );
}
