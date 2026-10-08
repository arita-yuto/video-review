"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import { AdminSection } from "@/components/admin/admin-section";
import { VideosTable } from "@/components/admin/videos-section/videos-table";
import { CsvActions } from "@/components/controls/csv-actions";
import { useVideoStore } from "@/stores/video-store";

export function VideosSection() {
    const t = useTranslations("admin-settings");

    // Remounting the table refetches it with the moved and renamed videos.
    const [tableKey, setTableKey] = useState(0);

    return (
        <AdminSection title={t("sections.videos")}>
            <VideosTable
                key={tableKey}
                actions={
                    <CsvActions
                        kind="videos"
                        exportCsv={() => api.admin.videos.export.$get()}
                        importCsv={(csv) => api.admin.videos.import.$post({ json: { csv } })}
                        onImported={() => {
                            setTableKey(k => k + 1);
                            void useVideoStore.getState().reloadOnDataChange();
                        }}
                    />
                }
            />
        </AdminSection>
    );
}
