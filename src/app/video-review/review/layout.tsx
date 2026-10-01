import VideoSidePanel from "@/components/video-side-panel";
import VideoListPanel from "@/components/video-browser";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PlaybackStoreProvider } from "@/stores/playback-store";

export default function VideoReviewLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="w-screen h-screen">
            <div>
                <SidebarProvider>
                    <PlaybackStoreProvider>
                        <VideoListPanel />
                        <div data-slot="review-main" className="w-screen h-screen grid review-columns">
                            <div className="flex flex-col min-h-0 min-w-0 w-full h-full border-r">
                                {children}
                            </div>
                            <div className="flex flex-col min-h-0 min-w-0 w-full h-full border-l">
                                <VideoSidePanel />
                            </div>
                        </div>
                    </PlaybackStoreProvider>
                </SidebarProvider>
            </div>
        </div>
    );
}
