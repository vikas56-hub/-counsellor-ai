
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getOrCreateGuestId } from "@/lib/auth/guest";

export function useUserOrGuest() {
    const { data: session, status } = useSession();
    const [guestId, setGuestId] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setGuestId(getOrCreateGuestId());
            setLoading(false);
        }
    }, []);

    if (status === "loading" || loading) return { userId: undefined, guestId: undefined, loading: true };
    if (session && session.user && typeof session.user.id === "string") {
        return { userId: session.user.id, guestId: undefined, loading: false };
    }
    // fallback to guest
    return { userId: undefined, guestId, loading: false };
}
