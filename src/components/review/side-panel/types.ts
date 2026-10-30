"use client";

import { RefObject, ReactNode } from "react";

// Shared render props passed from the side-panel shell into each panel body.
// `topAreaRef` points at the fixed header area so timeline-linked panels can
// keep the active card visible without hardcoding header height locally.
export type VideoSidePanelRenderProps = {
    topAreaRef: RefObject<HTMLDivElement | null>;
};

// Panel definitions are the attachment point for panel-specific behavior.
// The shell only knows how to render tabs, the active body, and optional slots.
// Search buttons, inline filters, and dialogs stay owned by each panel so
// comment/event differences do not leak back into the shared shell.
export type VideoSidePanelDefinition = {
    key: string;
    label: string;
    renderPanel: (props: VideoSidePanelRenderProps) => ReactNode;
    renderHeaderActions?: (props: { openDialog: () => void }) => ReactNode;
    renderHeaderBody?: () => ReactNode;
    renderDialog?: (props: { open: boolean; onClose: () => void }) => ReactNode;
};
