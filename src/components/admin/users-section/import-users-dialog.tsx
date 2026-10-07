"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, readError } from "@/lib/api-client";
import { FormDialog } from "@/components/dialog/form-dialog";
import { FilePicker } from "@/components/controls/file-picker";
import { CsvErrorTable, type CsvImportError } from "@/components/controls/csv-error-table";

const USER_ERROR_CODES = ["idReadOnly", "emailTaken"];

export function ImportUsersDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
    const t = useTranslations("admin-settings");

    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [errors, setErrors] = useState<CsvImportError[]>([]);
    const [failure, setFailure] = useState<string | null>(null);

    async function onSubmit() {
        if (!file) return;

        setImporting(true);
        setErrors([]);
        setFailure(null);

        try {
            const res = await api.admin.users.import.$post({ json: { csv: await file.text() } });
            if (res.status === 422) {
                setErrors((await res.json()).errors);
                return;
            }
            if (res.status !== 200) {
                throw new Error(await readError(res));
            }

            toast.success(t("users.import.created"));
            onImported();
            onClose();
        } catch (e) {
            setFailure(`${t("users.import.failed")}: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setImporting(false);
        }
    }

    return (
        <FormDialog
            open
            onClose={onClose}
            title={t("users.import.title")}
            onSubmit={onSubmit}
            submitLabel={t("users.import.submit")}
            cancelLabel={t("users.import.cancel")}
            submitDisabled={!file || importing}
            cancelDisabled={importing}
            message={failure ?? undefined}
        >
            <FilePicker
                accept=".csv,text/csv"
                file={file}
                placeholder={t("users.import.file")}
                onChange={(picked) => {
                    setFile(picked);
                    setErrors([]);
                }}
            />

            {errors.length > 0 && (
                <CsvErrorTable
                    errors={errors}
                    describe={(error) => USER_ERROR_CODES.includes(error.code) ? t(`users.import.errors.${error.code}`) : null}
                />
            )}
        </FormDialog>
    );
}
