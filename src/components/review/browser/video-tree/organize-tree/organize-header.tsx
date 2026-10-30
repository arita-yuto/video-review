import { useTranslations } from "next-intl";
import { Button } from "@/ui/button";
import { SidebarHeader } from "@/ui/sidebar";
import { Separator } from "@/ui/separator";
import { useVideoListStore } from "@/stores/video-list-store";
import { useVideoStore } from "@/stores/video-store";

export function OrganizeHeader() {
    const t = useTranslations("video-list-panel.organize");
    const setOrganizing = useVideoListStore((s) => s.setOrganizing);

    return (
        <SidebarHeader>
            <div className="flex items-center justify-between text-primary font-semibold text-sm">
                <span>{t("title")}</span>
                <Button
                    size="sm"
                    onClick={() => {
                        setOrganizing(false);
                        // Renames don't refresh the browsing list or the open video; catch up once here.
                        void useVideoStore.getState().reloadOnDataChange();
                    }}
                >
                    {t("done")}
                </Button>
            </div>
            <Separator />
        </SidebarHeader>
    );
}
