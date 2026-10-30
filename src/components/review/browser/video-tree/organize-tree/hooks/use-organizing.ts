import { isAdmin } from "@/lib/role";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { useAuthStore } from "@/stores/auth-store";
import { useVideoListStore } from "@/stores/video-list-store";

// Admin-only and desktop-only; the list is a sheet on the mobile layout.
// The flag outlives a sign-out in the same tab, so the role is read alongside it.
export function useOrganizing(): boolean {
    const organizing = useVideoListStore((s) => s.organizing);
    const role = useAuthStore((s) => s.role);
    const isMobile = useIsMobile();

    return organizing && isAdmin(role) && !isMobile;
}
