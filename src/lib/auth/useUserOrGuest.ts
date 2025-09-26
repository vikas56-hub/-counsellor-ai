import { useSession } from "next-auth/react";
import { getOrCreateGuestId } from "@/lib/auth/guest";

export function useUserOrGuest() {
    const { data: session, status } = useSession();
    if (status === "loading") return { userId: undefined, guestId: undefined, loading: true };
    if (session && session.user && typeof session.user.id === "string") {
        return { userId: session.user.id, guestId: undefined, loading: false };
    }
    // fallback to guest
    return { userId: undefined, guestId: getOrCreateGuestId(), loading: false };
}
