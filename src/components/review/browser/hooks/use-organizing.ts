import { isAdmin } from "@/lib/role";
import { useSidebar } from "@/ui/sidebar";
import { useAuthStore } from "@/components/stores/auth-store";
import { useVideoListStore } from "@/components/review/browser/stores/video-list-store";

// Admin-only, and only while the list is a column; a sheet has no room to organize in.
// The flag outlives a sign-out in the same tab, so the role is read alongside it.
export function useOrganizing(): boolean {
    const organizing = useVideoListStore((s) => s.organizing);
    const role = useAuthStore((s) => s.role);
    const { isMobile } = useSidebar();

    return organizing && isAdmin(role) && !isMobile;
}
