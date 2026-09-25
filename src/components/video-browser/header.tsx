"use client";

import React, { useEffect } from "react";
import { X, Plus, LayoutGrid, MessageSquare } from "lucide-react";
import { Button } from "@/ui/button";
import { SidebarSearchInput } from "@/components/controls/sidebar-search-input";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslations } from "next-intl";
import { isGuest } from "@/lib/role";
import { SidebarGroup, SidebarHeader, useSidebar } from "@/ui/sidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { useVideoSearchStore } from "@/stores/video-search-store";
import { useVideoDateFilterStore } from "@/stores/date-filter-store";
import { useVideoStore } from "@/stores/video-store";
import CalendarDateRadio from "@/components/controls/calendar-date-radio";
import { Separator } from "../ui/separator";
import { useChatSearchStore } from "@/stores/chat-search-store";
import { ChatSearchPanel } from "@/components/chat-search";

export default function VideoListPanelHeader(
{ onSearchDialogShow, onUploadDialogShow, onThumbnailsToggle, thumbnailsOpen }: {
    onSearchDialogShow: () => void;
    onUploadDialogShow: () => void;
    onThumbnailsToggle: () => void;
    thumbnailsOpen: boolean;
}) {
    const t = useTranslations("video-list-panel");
    const tChat = useTranslations("chat-search");
    const { isMobile } = useSidebar();
    const { role } = useAuthStore();
    const { fetchVideos } = useVideoStore();
    const { filterTree, setFilterTree, isFiltering, clear } = useVideoSearchStore();
    const videoDate = useVideoDateFilterStore();
    const { open: openChat } = useChatSearchStore();

    // Refetch when the tree text or the date filter changes.
    useEffect(() => {
        fetchVideos();
    }, [filterTree, videoDate.mode, videoDate.from, videoDate.to, videoDate.days]);

    // The date filter now lives in its own store, so fold it into the indicator.
    const filtering = isFiltering() || videoDate.mode !== "none";

    const handleClear = () => {
        clear();
        videoDate.clear();
        fetchVideos();
    }

    return (
        <SidebarHeader>
            <div className="flex justify-between text-primary font-semibold text-sm">
                <div className="flex items-center">
                    <span>{t("title")}</span>
                    <Button variant="toolbar" size="icon-sm" data-active={filtering} onClick={() => onSearchDialogShow()}>
                        <FontAwesomeIcon icon={faSearch} />
                    </Button>
                    {filtering && (
                        <Button variant="toolbar" size="icon-sm" onClick={() => handleClear()}>
                            <X className="size-5" />
                        </Button>
                    )}
                    <Button variant="toolbar" size="icon-sm" title={tChat("title")} onClick={() => openChat()}>
                        <MessageSquare />
                    </Button>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="toolbar"
                        size="icon-sm"
                        data-slot="thumbnails-toggle"
                        data-active={thumbnailsOpen}
                        // The panel does not render under the mobile sidebar sheet.
                        hidden={isMobile}
                        onClick={() => onThumbnailsToggle()}
                        title={t("thumbnails")}
                    >
                        <LayoutGrid className="size-5" />
                    </Button>
                    <Button
                        variant="toolbar"
                        size="icon-sm"
                        hidden={isGuest(role)}
                        onClick={() => onUploadDialogShow()}
                        title={t("upload")}
                    >
                        <Plus className="size-5" />
                    </Button>
                </div>
            </div>
            <Separator />

            <ChatSearchPanel />

            <SidebarGroup>
                <CalendarDateRadio
                    mode={videoDate.mode}
                    range={videoDate.mode === "range" && videoDate.from && videoDate.to
                        ? { from: new Date(videoDate.from), to: new Date(videoDate.to) }
                        : undefined}
                    onToday={videoDate.setToday}
                    onRecent={videoDate.setRecent}
                    onSetRange={videoDate.setRange}
                    onClear={videoDate.clear}
                    className="size-10" />

                <SidebarSearchInput value={filterTree} onChange={setFilterTree} placeholder="Filter video..." />
            </SidebarGroup>
            <Separator />
        </SidebarHeader>
    );
}
