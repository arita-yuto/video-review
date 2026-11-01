import { PanelRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/ui/button";
import { useVideoPlayerStore } from "@/components/review/stores/video-player-store";

export function SidePanelTrigger({ className }: { className?: string }) {
    const t = useTranslations("video-title");
    const sidePanelOpen = useVideoPlayerStore((s) => s.sidePanelOpen);
    const setSidePanelOpen = useVideoPlayerStore((s) => s.setSidePanelOpen);

    return (
        <Button variant="ghost" size="icon-sm" className={className} title={t("toggleSidePanel")} onClick={() => setSidePanelOpen(!sidePanelOpen)}>
            <PanelRight />
        </Button>
    );
}
