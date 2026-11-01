"use client";

import { useTranslations } from "next-intl";
import type { VideoSidePanelDefinition } from "@/components/review/side-panel/types";
import VcsChangesContent from "./content";

export function useVcsChangesPanelDefinition(): VideoSidePanelDefinition {
    const t = useTranslations("vcs-changes-panel");

    return {
        key: "vcs-changes",
        label: t("tab"),
        renderPanel: ({ topAreaRef }) => <VcsChangesContent topAreaRef={topAreaRef} />,
    };
}
