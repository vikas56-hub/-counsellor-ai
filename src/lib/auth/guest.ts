// Guest session logic for Next.js app
import { v4 as uuidv4 } from 'uuid';

const GUEST_ID_KEY = 'counslerai_guestId';

export function getOrCreateGuestId(): string {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem(GUEST_ID_KEY);
    if (!stored) {
        const newId = uuidv4();
        localStorage.setItem(GUEST_ID_KEY, newId);
        return newId;
    }
    return stored;
}

export function clearGuestId() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(GUEST_ID_KEY);
    }
}
