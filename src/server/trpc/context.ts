import { type NextRequest } from 'next/server';

export async function createContext(_req: NextRequest) {
    // Add auth/session context here if needed
    return {};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
