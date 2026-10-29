"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FormDialog } from "@/components/dialog/form-dialog";
import { ClearableComboBox, ClearableTextField } from "@/components/controls/clearable-fields";
import { ControlRow } from "@/components/controls/control-row";
import { useCommentSearchStore } from "@/stores/comment-search-store";
import { Checkbox } from "@/ui/checkbox";
import { useVideoStore } from "@/stores/video-store";
import { api } from "@/lib/api-client";
import { useCommentStore } from "@/stores/comment-store";


export function CommentSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations("comment-search");
    const [commentUsers, setCommentUsers] = useState<{ label: string, value: string }[]>([]);
    const { selectedRevision, revisions } = useVideoStore();
    const { fetchComments } = useCommentStore();
    const {
        hasDrawing,
        hasIssue,
        user,
        filterText,

        setHasDrawing,
        setHasIssue,
        setCommentUser,
        setFilterText,
    } = useCommentSearchStore();

    useEffect(() => {
        void (async () => {
            const res = await api.comments.users.$get({
                query: { videoId: selectedRevision?.videoId, hasDrawing: hasDrawing ? "true" : undefined },
            });
            const users = res.status === 200 ? await res.json() : [];
            setCommentUsers(users.map((u) => ({ label: u.userName, value: u.userName })));
        })();
    }, [open]);

    const handleSearch = () => {
        if (selectedRevision) {
            fetchComments(selectedRevision);
        }
        onClose();
    }

    return (
        <FormDialog open={open} onClose={onClose} title={t("title")} onSubmit={handleSearch} cancelLabel={t("cancel")} submitLabel={t("ok")}>
                    {ControlRow(t("searchFilter"), () => {
                        return (
                            <ClearableTextField
                                value={filterText}
                                onChange={setFilterText}
                                onClear={() => setFilterText("")}
                                placeholder="Filter text..." />
                        );
                    })}

                    {ControlRow(t("hasDrawing"), () => {
                        return (
                            <Checkbox
                                defaultChecked={hasDrawing}
                                onCheckedChange={(x) => { setHasDrawing(x as boolean) }}
                                size="lg"
                            />
                        );
                    })}

                    {ControlRow(t("hasIssue"), () => {
                        return (
                            <Checkbox
                                defaultChecked={hasIssue}
                                onCheckedChange={(x) => { setHasIssue(x as boolean) }}
                                size="lg"
                            />
                        );
                    })}

                    {ControlRow(t("userFilter"), () => {
                        return (
                            <ClearableComboBox
                                options={commentUsers}
                                setValue={setCommentUser}
                                value={user}
                                placeholder="Select user..."
                                onClear={() => setCommentUser(undefined)} />
                        );
                    })}

        </FormDialog>
    );
}
