import { z } from 'zod';
import { publicProcedure, router } from '../trpc/trpc';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const chatRouter = router({
    // Fetch all sessions for a user (real or guest)
    getSessions: publicProcedure
        .input(z.object({ userId: z.string().optional(), guestId: z.string().optional() }))
        .query(async ({ input }) => {
            if (input.userId) {
                return prisma.chatSession.findMany({
                    where: { userId: input.userId },
                    include: { messages: true },
                    orderBy: { createdAt: 'desc' },
                });
            } else if (input.guestId) {
                return prisma.chatSession.findMany({
                    where: { guestId: input.guestId },
                    include: { messages: true },
                    orderBy: { createdAt: 'desc' },
                });
            } else {
                return [];
            }
        }),

    // Fetch a single session by ID
    getSession: publicProcedure
        .input(z.object({ sessionId: z.string() }))
        .query(async ({ input }) => {
            return prisma.chatSession.findUnique({
                where: { id: input.sessionId },
                include: { messages: true },
            });
        }),

    // Create a new session, fallback to Guest if no userId provided
    createSession: publicProcedure
        .input(z.object({ userId: z.string().optional(), guestId: z.string().optional(), topic: z.string().optional() }))
        .mutation(async ({ input }) => {
            try {
                const session = await prisma.chatSession.create({
                    data: {
                        userId: input.userId,
                        guestId: input.guestId,
                        topic: input.topic,
                    },
                });
                return session;
            } catch (err) {
                console.error('Error creating session:', err, 'userId:', input.userId, 'guestId:', input.guestId);
                throw err;
            }
        }),

    // Add a message to an existing session
    addMessage: publicProcedure
        .input(
            z.object({
                sessionId: z.string(),
                sender: z.enum(['user', 'ai']),
                content: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            // Defensive: ensure session exists before adding message
            const session = await prisma.chatSession.findUnique({ where: { id: input.sessionId } });
            if (!session) {
                throw new Error("Chat session does not exist");
            }
            return prisma.message.create({
                data: {
                    chatSessionId: input.sessionId,
                    sender: input.sender,
                    content: input.content,
                },
            });
        }),
});
