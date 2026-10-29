"use client";

import { useTranslations } from "next-intl";
import { CommentSearchDialog } from "@/components/dialog/comment-search";
import { RevisionFilterRadio } from "@/components/controls/revision-filter-radio";
import { SidebarGroup } from "@/ui/sidebar";
import { SidebarSearchInput } from "@/components/controls/sidebar-search-input";
import { PanelSearchActions } from "@/components/video-side-panel/panel-search-actions";
import VideoCommentContent from "@/components/video-side-panel/panels/video-comment-panel/content";
import { useCommentSearchStore } from "@/stores/comment-search-store";
import { useCommentStore } from "@/stores/comment-store";
import { useVideoStore } from "@/stores/video-store";
import { VideoSidePanelDefinition } from "@/components/video-side-panel/types";

export function useVideoCommentPanelDefinition(): VideoSidePanelDefinition {
    const tComment = useTranslations("video-comment-panel");
    const { selectedVideo, selectedRevision } = useVideoStore();
    const { fetchComments } = useCommentStore();
    const commentSearch = useCommentSearchStore();
    const filtering = commentSearch.isFiltering(selectedVideo?.id);

    return {
        key: "comments",
        label: tComment("title"),
        renderPanel: () => <VideoCommentContent />,
        renderHeaderActions: ({ openDialog }) => (
            <PanelSearchActions
                filtering={filtering}
                onOpen={openDialog}
                onClear={() => {
                    commentSearch.clear();
                    if (selectedRevision) {
                        fetchComments(selectedRevision);
                    }
                }}
            />
        ),
        renderHeaderBody: () => (
            <SidebarGroup>
                <RevisionFilterRadio value={commentSearch.revisionFilter} onChange={commentSearch.setRevisionFilter} />

                <SidebarSearchInput value={commentSearch.filterText} onChange={commentSearch.setFilterText} placeholder="Filter comment text..." />
            </SidebarGroup>
        ),
        renderDialog: ({ open, onClose }) => (
            <CommentSearchDialog open={open} onClose={onClose} />
        ),
    };
}
