import { z } from 'zod';
import { publicProcedure, router } from '../trpc/trpc';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_TITLE || 'CounslerAI',
    },
});

export const aiRouter = router({
    getCareerAdvice: publicProcedure
        .input(z.object({ prompt: z.string(), context: z.array(z.object({ sender: z.string(), content: z.string() })).optional() }))
        .mutation(async ({ input }) => {
            // Build OpenAI-style message array
            const messages: ChatCompletionMessageParam[] = [
                { role: 'system', content: 'You are a helpful AI career counselor.' },
                ...((input.context ?? []).map(msg =>
                    msg.sender === 'ai'
                        ? { role: 'assistant', content: msg.content } as const
                        : { role: 'user', content: msg.content } as const
                ))
            ];
            // Always append the latest prompt as the last user message if not already present
            if (!messages.length || messages[messages.length - 1].content !== input.prompt) {
                messages.push({ role: 'user', content: input.prompt });
            }
            const completion = await openai.chat.completions.create({
                model: 'openai/gpt-4o',
                messages,
                max_tokens: 1000,
            });
            return { response: completion.choices[0]?.message?.content ?? '' };
        }),
});
