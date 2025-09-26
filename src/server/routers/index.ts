import { router } from '../trpc/trpc';
import { chatRouter } from './chat';
import { aiRouter } from './ai';

export const appRouter = router({
    chat: chatRouter,
    ai: aiRouter,
});

export type AppRouter = typeof appRouter;
