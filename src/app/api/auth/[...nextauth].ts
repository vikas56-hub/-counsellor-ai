import NextAuth, { Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import type { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }),
        EmailProvider({
            server: process.env.EMAIL_SERVER!,
            from: process.env.EMAIL_FROM!,
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async session({ session, token, user }) {
            // Attach user id to session
            if (session.user) {
                session.user.id = token.sub;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
    },
    pages: {
        signIn: "/login",
    },
};


// Extend NextAuth session type to include user.id
declare module "next-auth" {
    interface Session {
        user?: {
            id?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
