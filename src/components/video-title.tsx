"use client";
import { useRef, useState } from "react";
import { useVideoStore } from "@/stores/video-store";
import { useAuthStore } from "@/stores/auth-store";
import { useLocale } from "@/app/locale-provider";
import { isAdmin } from "@/lib/role";
import { useTranslations } from "next-intl";
import { SidebarTrigger } from "@/ui/sidebar";
import { Separator } from "@/ui/separator";
import { Badge } from "@/ui/badge";
import { Switch } from "@/ui/switch";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faPlus } from "@fortawesome/free-solid-svg-icons";
import { formatDateTime } from "@/lib/utils";
import { CompareButton } from "@/components/revision-diff-view/compare-button";

export default function VideoTitle() {
    const t = useTranslations("video-title");
    const { locale } = useLocale();

    const {
        selectedVideo,
        revisions,
        selectedRevision,
        allVideoTags,
        selectVideoRevision,
        updateRevisionTags,
        setGuestVisible,
    } = useVideoStore();

    const role = useAuthStore((s) => s.role);
    const canEditTags = isAdmin(role);

    const [inputVisible, setInputVisible] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const currentTags: string[] = selectedRevision?.tags ?? [];

    const suggestions = allVideoTags.filter(
        (t) => t.toLowerCase().includes(inputValue.toLowerCase()) && !currentTags.includes(t)
    );

    const addTag = async (tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed || !selectedRevision || currentTags.includes(trimmed)) return;
        await updateRevisionTags(selectedRevision.id, [...currentTags, trimmed]);
        setInputValue("");
        setInputVisible(false);
    };

    const removeTag = async (tag: string) => {
        if (!selectedRevision) return;
        await updateRevisionTags(selectedRevision.id, currentTags.filter((t) => t !== tag));
    };

    return (
        <div className="py-1 px-2 mb-2 flex items-center justify-between">
            <div className="min-w-0">
                <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-1 px-2 text-lg font-semibold text-primary tracking-wide">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <span className="truncate">{selectedVideo?.title ?? t("noSelection")}</span>
                    </h2>
                    <div className="flex items-center gap-3">
                        {revisions.length > 1 && selectedRevision && (
                            <CompareButton revisions={revisions} selected={selectedRevision} />
                        )}
                        {revisions.length > 1 && (
                            <Select
                                value={selectedRevision?.id ?? ""}
                                onValueChange={(id) => {
                                    const rev = revisions.find((r) => r.id === id);
                                    if (rev) selectVideoRevision(rev);
                                }}
                            >
                                <SelectTrigger size="sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {revisions.map((r) => (
                                        <SelectItem key={r.id} value={r.id}>
                                            {t("revisionOption", {
                                                revision: r.revision,
                                                date: new Date(r.uploadedAt).toLocaleDateString(locale)
                                            })}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {selectedRevision
                        ? t("revisionInfo", {
                            revision: selectedRevision.revision,
                            uploadedAt: formatDateTime(selectedRevision.uploadedAt, locale)
                        })
                        : t("noRevision")}
                </p>

                {selectedRevision && (
                    <div className="px-2 mt-2">
                        <div className="flex flex-wrap items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                                {t("tagsLabel")}:
                            </span>
                            {currentTags.map((tag) => (
                                <Badge key={tag} variant="outline">
                                    {tag}
                                    {canEditTags && (
                                        <button
                                            onClick={() => void removeTag(tag)}
                                            className="text-muted-foreground hover:text-destructive transition"
                                        >
                                            <FontAwesomeIcon icon={faXmark} className="text-2xs" />
                                        </button>
                                    )}
                                </Badge>
                            ))}

                            {canEditTags && (inputVisible ? (
                                <div className="relative">
                                    <Input
                                        ref={inputRef}
                                        autoFocus
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") void addTag(inputValue);
                                            if (e.key === "Escape") {
                                                setInputVisible(false);
                                                setInputValue("");
                                            }
                                        }}
                                        onBlur={() => {
                                            if (!inputValue) {
                                                setInputVisible(false);
                                            }
                                        }}
                                        className="h-7 w-28 text-xs md:text-xs"
                                        placeholder={t("tagInputPlaceholder")}
                                    />
                                    {suggestions.length > 0 && inputValue && (
                                        <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded shadow-lg min-w-30">
                                            {suggestions.slice(0, 6).map((s) => (
                                                <button
                                                    key={s}
                                                    onMouseDown={(e) => { e.preventDefault(); void addTag(s); }}
                                                    className="w-full text-left text-xs px-2 py-1 hover:bg-primary hover:text-primary-foreground transition"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => setInputVisible(true)}
                                    className="text-muted-foreground hover:text-primary transition"
                                    title={t("addTag")}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="text-2xs" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {isAdmin(role) && selectedVideo && (
                <div className="shrink-0 self-start mt-1 flex items-center gap-2" title={t("guestVisible")}>
                    <Badge variant={selectedVideo.guestVisible ? "default" : "outline"}>Guests</Badge>
                    <Switch
                        checked={selectedVideo.guestVisible ?? false}
                        onCheckedChange={(v) => void setGuestVisible(selectedVideo.id, v)}
                    />
                </div>
            )}
        </div>
    );
}
