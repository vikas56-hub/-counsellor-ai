'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from './client';
import { httpBatchLink } from '@trpc/client';
import { ReactNode, useState } from 'react';

export function TRPCProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({ url: '/api/trpc' }),
            ],
        })
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </trpc.Provider>
    );
}
