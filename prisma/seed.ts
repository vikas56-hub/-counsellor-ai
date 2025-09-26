import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Create a demo user
    const user = await prisma.user.upsert({
        where: { email: 'demo@user.com' },
        update: {},
        create: {
            email: 'demo@user.com',
            name: 'Demo User',
        },
    });

    // Create a chat session for the user
    const session = await prisma.chatSession.create({
        data: {
            userId: user.id,
            topic: 'Career Guidance',
            messages: {
                create: [
                    {
                        sender: 'user',
                        content: 'What career should I pursue after graduation?'
                    },
                    {
                        sender: 'ai',
                        content: 'Let me help you explore your interests and strengths!'
                    }
                ]
            }
        },
        include: { messages: true }
    });

    console.log('Seeded user:', user);
    console.log('Seeded session:', session);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
