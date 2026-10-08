"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FormDialog } from "@/components/dialog/form-dialog";
import { ClearableComboBox, ClearableTextField } from "@/components/controls/clearable-fields";
import { api } from "@/lib/api-client";
import { ControlRow } from "@/components/controls/control-row";
import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";
import { useVideoSearchStore } from "@/stores/video-search-store";
import { useVideoDateFilterStore, useVideoCommentsDateFilterStore } from "@/stores/date-filter-store";
import { useVideoStore } from "@/stores/video-store";
import CalendarDateRadio from "@/components/controls/calendar-date-radio";
import MultiComboBox from "@/components/controls/multi-combobox";

export function VideoSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations("video-search");
    const { reloadOnViewChange, allVideoTags } = useVideoStore();
    const [commentUsers, setCommentUsers] = useState<{ label: string, value: string }[]>([]);

    const {
        user,
        filterIssue,
        filterTree,
        hasComment,
        hasIssue,
        hasDrawing,
        tags,

        setHasComment,
        setCommentUser,
        setHasDrawing,
        setHasIssue,
        setFilterIssue,
        setFilterTree,
        setTags
    } = useVideoSearchStore();
    const videoDate = useVideoDateFilterStore();
    const commentsDate = useVideoCommentsDateFilterStore();

    useEffect(() => {
        void (async () => {
            const res = await api.comments.users.$get({ query: { hasDrawing: hasDrawing ? "true" : undefined } });
            const users = res.status === 200 ? await res.json() : [];
            setCommentUsers(users.map((u) => ({ label: u.userName, value: u.userName })));
        })();
    }, [open]);

    const handleSearch = () => {
        reloadOnViewChange();
        onClose();
    }

    const handleClearUserFilter = () => {
        setCommentUser(undefined);
        commentsDate.clear();
    }

    const handleClearTreeFilter = () => {
        videoDate.clear();
    }

    return (
        <FormDialog open={open} onClose={onClose} title={t("title")} onSubmit={handleSearch} cancelLabel={t("cancel")} submitLabel={t("ok")}>
                    {ControlRow(t("hasComment"), () => {
                        return (
                            <Checkbox
                                defaultChecked={hasComment}
                                onCheckedChange={(x) => setHasComment(x as boolean)}
                                size="lg"
                            />
                        );
                    })}

                    {hasComment
                        ? (
                            <>
                                {ControlRow(t("userFilter"), () => {
                                    return (
                                        <ClearableComboBox
                                            options={commentUsers}
                                            setValue={setCommentUser}
                                            value={user}
                                            placeholder="Select user..."
                                            onClear={handleClearUserFilter} />
                                    );
                                })}

                                {ControlRow(t("commentsDateRange"), () => {
                                    return (
                                        <div className="flex justify-between">
                                            <CalendarDateRadio
                                                mode={commentsDate.mode}
                                                range={commentsDate.mode === "range" && commentsDate.from && commentsDate.to
                                                    ? { from: new Date(commentsDate.from), to: new Date(commentsDate.to) }
                                                    : undefined}
                                                onToday={commentsDate.setToday}
                                                onRecent={commentsDate.setRecent}
                                                onSetRange={commentsDate.setRange}
                                                onClear={commentsDate.clear} />
                                        </div>
                                    );
                                })}

                                {ControlRow(t("hasIssue"), () => {
                                    return (
                                        <Checkbox
                                            defaultChecked={hasIssue}
                                            onCheckedChange={(x) => setHasIssue(x as boolean)}
                                            size="lg"
                                        />
                                    );
                                })}

                                {hasIssue ?
                                    (<>
                                        {ControlRow(t("filterIssue"), () => {
                                            return (
                                                <Input
                                                    type="text"
                                                    value={filterIssue}
                                                    onChange={(e) => setFilterIssue(e.target.value)}
                                                    className="h-8"
                                                    placeholder="Filter..."
                                                />
                                            );
                                        })}
                                    </>) : (<></>)}

                                {ControlRow(t("hasDrawing"), () => {
                                    return (
                                        <Checkbox
                                            defaultChecked={hasDrawing}
                                            onCheckedChange={(x) => setHasDrawing(x as boolean)}
                                            size="lg"
                                        />
                                    );
                                })}
                            </>
                        )
                        : (<></>)
                    }

                    {ControlRow(t("searchFilter"), () => {
                        return (
                            <ClearableTextField
                                value={filterTree}
                                onChange={setFilterTree}
                                onClear={handleClearTreeFilter}
                                placeholder="Filter tree..." />
                        );
                    })}

                    {ControlRow(t("videoDateRange"), () => {
                        return (
                            <div className="flex justify-between">
                                <CalendarDateRadio
                                    mode={videoDate.mode}
                                    range={videoDate.mode === "range" && videoDate.from && videoDate.to
                                        ? { from: new Date(videoDate.from), to: new Date(videoDate.to) }
                                        : undefined}
                                    onToday={videoDate.setToday}
                                    onRecent={videoDate.setRecent}
                                    onSetRange={videoDate.setRange}
                                    onClear={videoDate.clear} />
                            </div>
                        );
                    })}

                    {ControlRow("Tags", () => {
                        return (
                            <div className="w-full">
                                <MultiComboBox
                                    placeholder="Select tags..."
                                    options={allVideoTags ?? []}
                                    value={tags}
                                    setValue={setTags}
                                />
                            </div>
                        );
                    })}
        </FormDialog>
    );
}

