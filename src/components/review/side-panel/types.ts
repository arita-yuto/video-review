"use client";

import { RefObject, ReactNode } from "react";

// topAreaRef points at the fixed header, so a panel can keep its active card visible below it.
export type VideoSidePanelRenderProps = {
    topAreaRef: RefObject<HTMLDivElement | null>;
};

export type VideoSidePanelDefinition = {
    key: string;
    label: string;
    renderPanel: (props: VideoSidePanelRenderProps) => ReactNode;
    renderHeaderActions?: (props: { openDialog: () => void }) => ReactNode;
    renderHeaderBody?: () => ReactNode;
    renderDialog?: (props: { open: boolean; onClose: () => void }) => ReactNode;
};
