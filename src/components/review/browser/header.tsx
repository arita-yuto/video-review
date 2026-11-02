"use client";

import React, { useEffect } from "react";
import { X, Plus, LayoutGrid, MessageSquare, FolderTree } from "lucide-react";
import { Button } from "@/ui/button";
import { SidebarSearchInput } from "@/components/controls/sidebar-search-input";
import { useAuthStore } from "@/components/stores/auth-store";
import { useTranslations } from "next-intl";
import { isAdmin, isGuest } from "@/lib/role";
import { SidebarGroup, SidebarHeader, useSidebar } from "@/ui/sidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { useVideoSearchStore } from "@/components/stores/video-search-store";
import { useVideoDateFilterStore } from "@/components/stores/date-filter-store";
import { useVideoStore } from "@/components/stores/video-store";
import CalendarDateRadio from "@/components/controls/calendar-date-radio";
import { Separator } from "@/components/ui/separator";
import { useChatSearchStore } from "@/components/review/browser/stores/chat-search-store";
import { ChatSearchPanel } from "@/components/review/browser/chat-search";
import { AccountMenu } from "@/components/account/setting";
import { OrganizeHeader } from "@/components/review/browser/video-tree/organize-tree/organize-header";
import { useOrganizing } from "@/components/review/browser/hooks/use-organizing";
import { useVideoListStore } from "@/components/review/browser/stores/video-list-store";

export default function VideoListPanelHeader(
{ onSearchDialogShow, onUploadDialogShow, onThumbnailsToggle, thumbnailsOpen }: {
    onSearchDialogShow: () => void;
    onUploadDialogShow: () => void;
    onThumbnailsToggle: () => void;
    thumbnailsOpen: boolean;
}) {
    const t = useTranslations("video-list-panel");
    const tChat = useTranslations("chat-search");
    const { isMobile, setOpenMobile } = useSidebar();
    const { role } = useAuthStore();
    const { reloadOnViewChange } = useVideoStore();
    const { filterTree, setFilterTree, isFiltering, clear } = useVideoSearchStore();
    const videoDate = useVideoDateFilterStore();
    const { open: openChat } = useChatSearchStore();
    const organizing = useOrganizing();
    const setOrganizing = useVideoListStore((s) => s.setOrganizing);

    useEffect(() => {
        reloadOnViewChange();
    }, [filterTree, videoDate.mode, videoDate.from, videoDate.to, videoDate.days]);

    const filtering = isFiltering() || videoDate.mode !== "none";

    const handleClear = () => {
        clear();
        videoDate.clear();
        reloadOnViewChange();
    }

    // The mode lists every video, so the filters have nothing to act on while it is on.
    if (organizing) {
        return <OrganizeHeader />;
    }

    return (
        <SidebarHeader>
            <div className="flex justify-between font-semibold text-sm">
                <div className="flex items-center">
                    <span className="text-primary">{t("title")}</span>
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
                        hidden={!isAdmin(role) || isMobile}
                        onClick={() => setOrganizing(true)}
                        title={t("organize.open")}
                    >
                        <FolderTree className="size-5" />
                    </Button>
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
                    {/* While the list is a sheet the account menu lives here; a footer would cost the list height. */}
                    {isMobile && <AccountMenu compact />}
                    {/* On a small screen the sheet can cover everything, so it needs its own way back. */}
                    <Button variant="ghost" size="icon-sm" hidden={!isMobile} onClick={() => setOpenMobile(false)}>
                        <X className="size-5" />
                    </Button>
                </div>
            </div>
            <Separator />

            <ChatSearchPanel />

            <SidebarGroup>
                <div className="mobile:flex mobile:flex-wrap mobile:items-center mobile:gap-2">
                    <CalendarDateRadio
                        mode={videoDate.mode}
                        range={videoDate.mode === "range" && videoDate.from && videoDate.to
                            ? { from: new Date(videoDate.from), to: new Date(videoDate.to) }
                            : undefined}
                        onToday={videoDate.setToday}
                        onRecent={videoDate.setRecent}
                        onSetRange={videoDate.setRange}
                        onClear={videoDate.clear}
                        className="h-10 mobile:h-auto mobile:shrink-0" />

                    <SidebarSearchInput value={filterTree} onChange={setFilterTree} placeholder="Filter video..." className="mobile:flex-1 mobile:min-w-32 mobile:mt-0" />
                </div>
            </SidebarGroup>
            <Separator />
        </SidebarHeader>
    );
}
