// Guest session logic for Next.js app
import { v4 as uuidv4 } from 'uuid';

const GUEST_ID_KEY = 'counslerai_guestId';

export function getOrCreateGuestId(): string {
    if (typeof window === 'undefined') return '';
    let guestId = localStorage.getItem(GUEST_ID_KEY);
    if (!guestId) {
        guestId = uuidv4();
        localStorage.setItem(GUEST_ID_KEY, guestId);
        return guestId;
    }
    // guestId is string | null, so always return a string
    return guestId || '';
}

export function clearGuestId() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(GUEST_ID_KEY);
    }
}
